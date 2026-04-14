import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { KBO_TEAMS, toKSTDateString } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import { fetchGames, fetchRecentForm, fetchHeadToHead, DEFAULT_PARK_FACTORS } from '../scrapers/kbo-official';
import { fetchPitcherStats, fetchTeamStats, fetchEloRatings, findPitcher } from '../scrapers/fancy-stats';
import { fetchBatterLeaders } from '../scrapers/fangraphs';
import { predict } from '../engine/predictor';
import { runDebate } from '../agents/debate';
import type { GameContext } from '../agents/types';
import type { PredictionHistory } from '../agents/calibration-agent';
import { notifyPredictions, notifyResults, notifyError, notifyPipelineStatus } from '../notify/telegram';
import type { PredictionInput, PredictionResult, PipelineResult, ScrapedGame } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

function createAdminClient(): DB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const CURRENT_SEASON = new Date().getFullYear();

// KBO 리그 ID (leagues 테이블)
async function getKBOLeagueId(db: DB): Promise<number> {
  const { data } = await db.from('leagues').select('id').eq('code', 'KBO').single();
  if (!data) throw new Error('KBO league not found in DB');
  return data.id;
}

// 팀 코드 → teams.id 매핑
async function getTeamIdMap(
  db: DB,
  leagueId: number
): Promise<Record<TeamCode, number>> {
  const { data } = await db.from('teams').select('id, code').eq('league_id', leagueId);
  if (!data) return {} as Record<TeamCode, number>;

  const map: Partial<Record<TeamCode, number>> = {};
  for (const team of data) {
    map[team.code as TeamCode] = team.id;
  }
  return map as Record<TeamCode, number>;
}

// 선수 이름 → players.id (없으면 생성)
async function getOrCreatePlayerId(
  db: DB,
  leagueId: number,
  name: string,
  teamId: number,
  position: string
): Promise<number> {
  const { data: existing } = await db
    .from('players')
    .select('id')
    .eq('league_id', leagueId)
    .eq('name_ko', name)
    .eq('team_id', teamId)
    .single();

  if (existing) return existing.id;

  const { data: created } = await db
    .from('players')
    .insert({ league_id: leagueId, name_ko: name, team_id: teamId, position })
    .select('id')
    .single();

  if (!created) throw new Error(`Failed to create player: ${name}`);
  return created.id;
}

/**
 * 일일 파이프라인 메인 함수
 * mode: 'predict' (KST 15:00) | 'verify' (KST 23:00)
 */
export async function runDailyPipeline(
  date?: string,
  mode: 'predict' | 'verify' = 'predict',
  triggeredBy: 'cron' | 'manual' | 'api' = 'api'
): Promise<PipelineResult> {
  const startTime = Date.now();
  const targetDate = date || toKSTDateString();
  const db = createAdminClient();
  const errors: string[] = [];
  const predictionSummaries: Array<{
    homeTeam: string; awayTeam: string;
    predictedWinner: string; confidence: number; homeWinProb: number;
  }> = [];

  console.log(`[Pipeline] ${mode} mode for ${targetDate}`);

  const leagueId = await getKBOLeagueId(db);
  const teamIdMap = await getTeamIdMap(db, leagueId);

  // 1. KBO 공식에서 경기 목록 수집
  let games: ScrapedGame[];
  try {
    games = await fetchGames(targetDate);
    console.log(`[Pipeline] ${games.length} games found`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { date: targetDate, gamesFound: 0, predictionsGenerated: 0, gamesSkipped: 0, errors: [msg] };
  }

  if (games.length === 0) {
    return { date: targetDate, gamesFound: 0, predictionsGenerated: 0, gamesSkipped: 0, errors: [] };
  }

  // games 테이블에 upsert
  for (const game of games) {
    const homeTeamId = teamIdMap[game.homeTeam];
    const awayTeamId = teamIdMap[game.awayTeam];
    if (!homeTeamId || !awayTeamId) {
      errors.push(`Unknown team: ${game.homeTeam} or ${game.awayTeam}`);
      continue;
    }

    await db.from('games').upsert(
      {
        league_id: leagueId,
        game_date: game.date,
        game_time: game.gameTime,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        stadium: game.stadium,
        status: game.status,
        home_score: game.homeScore ?? null,
        away_score: game.awayScore ?? null,
        winner_team_id: game.status === 'final' && game.homeScore != null && game.awayScore != null
          ? (game.homeScore > game.awayScore ? homeTeamId : awayTeamId)
          : null,
        external_game_id: game.externalGameId,
      },
      { onConflict: 'league_id,external_game_id' }
    );
  }

  // verify 모드면 결과만 업데이트하고 끝
  if (mode === 'verify') {
    await updateAccuracy(db, leagueId, targetDate);

    // 결과 알림용 데이터 수집
    const verifyResults = await getVerifyResults(db, leagueId, targetDate, teamIdMap);
    const durationMs = Date.now() - startTime;
    const verifyResult: PipelineResult = {
      date: targetDate, gamesFound: games.length,
      predictionsGenerated: 0, gamesSkipped: 0, errors,
    };

    // 실행 히스토리 기록
    await db.from('pipeline_runs').insert({
      run_date: targetDate, mode, status: 'success',
      games_found: games.length, predictions: 0, games_skipped: 0,
      errors: '[]', duration_ms: durationMs, triggered_by: triggeredBy,
    }).then(null, (e: unknown) => console.error('[Pipeline] Failed to log run:', e));

    // Telegram 결과 알림
    try {
      if (verifyResults.length > 0) {
        await notifyResults(targetDate, verifyResults as any);
      }
    } catch (e) {
      console.error('[Pipeline] Telegram notification failed:', e);
    }

    return verifyResult;
  }

  // 2. Fancy Stats에서 통계 수집
  console.log('[Pipeline] Fetching Fancy Stats...');
  const [pitcherStats, teamStats, eloRatings] = await Promise.all([
    fetchPitcherStats(CURRENT_SEASON).catch((e) => { errors.push(`FancyStats pitchers: ${e}`); return []; }),
    fetchTeamStats(CURRENT_SEASON).catch((e) => { errors.push(`FancyStats teams: ${e}`); return []; }),
    fetchEloRatings(CURRENT_SEASON).catch((e) => { errors.push(`FancyStats elo: ${e}`); return []; }),
  ]);

  // 3. FanGraphs 보조 데이터
  console.log('[Pipeline] Fetching FanGraphs...');
  const fgBatters = await fetchBatterLeaders(CURRENT_SEASON).catch((e) => {
    errors.push(`FanGraphs: ${e}`);
    return [];
  });

  // FanGraphs 데이터로 TeamStats 보강
  for (const fg of fgBatters) {
    const ts = teamStats.find((t) => t.team === fg.team);
    if (ts) {
      ts.wrcPlus = fg.wrcPlus;
      ts.iso = fg.iso;
    }
  }

  // team_season_stats upsert
  for (const ts of teamStats) {
    const teamId = teamIdMap[ts.team];
    if (!teamId) continue;
    const elo = eloRatings.find((e) => e.team === ts.team);

    await db.from('team_season_stats').upsert(
      {
        team_id: teamId,
        season: CURRENT_SEASON,
        team_woba: ts.woba,
        team_wrc_plus: ts.wrcPlus ?? null,
        bullpen_fip: ts.bullpenFip,
        sfr: ts.sfr,
        elo_rating: elo?.elo ?? null,
        elo_win_pct: elo?.winPct ?? null,
        total_war: ts.totalWar,
        last_synced: new Date().toISOString(),
      },
      { onConflict: 'team_id,season' }
    );
  }

  // 4. 각 경기에 대해 예측 실행
  let predictionsGenerated = 0;
  let gamesSkipped = 0;

  for (const game of games) {
    if (game.status !== 'scheduled') {
      gamesSkipped++;
      continue;
    }

    // 선발투수 미확정이면 스킵
    if (!game.homeSP || !game.awaySP) {
      console.log(`[Pipeline] Skipping ${game.homeTeam} vs ${game.awayTeam}: SP not confirmed`);
      gamesSkipped++;
      continue;
    }

    const homeTeamStat = teamStats.find((t) => t.team === game.homeTeam);
    const awayTeamStat = teamStats.find((t) => t.team === game.awayTeam);
    const homeElo = eloRatings.find((e) => e.team === game.homeTeam);
    const awayElo = eloRatings.find((e) => e.team === game.awayTeam);

    // fallback 값
    const defaultTeamStats = { team: game.homeTeam as TeamCode, woba: 0.320, bullpenFip: 4.00, totalWar: 12, sfr: 0 };
    const defaultElo = { team: game.homeTeam as TeamCode, elo: 1500, winPct: 0.5 };

    // 최근폼, 상대전적 수집
    const [homeForm, awayForm, h2h] = await Promise.all([
      fetchRecentForm(game.homeTeam, CURRENT_SEASON).catch(() => 0.5),
      fetchRecentForm(game.awayTeam, CURRENT_SEASON).catch(() => 0.5),
      fetchHeadToHead(game.homeTeam, game.awayTeam, CURRENT_SEASON).catch(() => ({ wins: 0, losses: 0 })),
    ]);

    const input: PredictionInput = {
      game,
      homeSPStats: findPitcher(pitcherStats, game.homeSP, game.homeTeam),
      awaySPStats: findPitcher(pitcherStats, game.awaySP, game.awayTeam),
      homeTeamStats: homeTeamStat || { ...defaultTeamStats, team: game.homeTeam },
      awayTeamStats: awayTeamStat || { ...defaultTeamStats, team: game.awayTeam },
      homeElo: homeElo || { ...defaultElo, team: game.homeTeam },
      awayElo: awayElo || { ...defaultElo, team: game.awayTeam },
      headToHead: h2h,
      homeRecentForm: homeForm,
      awayRecentForm: awayForm,
      parkFactor: DEFAULT_PARK_FACTORS[game.stadium] ?? 1.0,
    };

    const quantResult = predict(input);

    // 에이전트 토론 (ANTHROPIC_API_KEY가 있으면 실행)
    let finalWinner = quantResult.predictedWinner;
    let finalHomeProb = quantResult.homeWinProb;
    let finalConfidence = quantResult.confidence;
    let finalReasoning: any = quantResult;

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const gameContext: GameContext = {
          game: input.game,
          homeSPStats: input.homeSPStats,
          awaySPStats: input.awaySPStats,
          homeTeamStats: input.homeTeamStats,
          awayTeamStats: input.awayTeamStats,
          homeElo: input.homeElo,
          awayElo: input.awayElo,
          homeRecentForm: input.homeRecentForm,
          awayRecentForm: input.awayRecentForm,
          headToHead: input.headToHead,
          parkFactor: input.parkFactor,
        };
        const history = await getPredictionHistory(db, leagueId, game.homeTeam, game.awayTeam);
        const debate = await runDebate(gameContext, quantResult.homeWinProb, history);

        finalWinner = debate.verdict.predictedWinner;
        finalHomeProb = debate.verdict.homeWinProb;
        finalConfidence = debate.verdict.confidence;
        finalReasoning = {
          ...quantResult,
          debate: {
            homeArgument: debate.homeArgument,
            awayArgument: debate.awayArgument,
            calibration: debate.calibration,
            verdict: debate.verdict,
            quantitativeProb: debate.quantitativeProb,
            totalTokens: debate.totalTokens,
          },
        };
      } catch (e) {
        console.error(`[Pipeline] Debate failed for ${game.homeTeam} vs ${game.awayTeam}:`, e);
        // fallback: 정량 모델 결과 사용
      }
    }

    const result = { ...quantResult, predictedWinner: finalWinner, homeWinProb: finalHomeProb, confidence: finalConfidence };

    // DB에 저장
    const homeTeamId = teamIdMap[game.homeTeam];
    const awayTeamId = teamIdMap[game.awayTeam];

    // game ID 조회
    const { data: dbGame } = await db
      .from('games')
      .select('id')
      .eq('external_game_id', game.externalGameId)
      .eq('league_id', leagueId)
      .single();

    if (dbGame) {
      // 선발투수 ID 저장
      if (game.homeSP && homeTeamId) {
        const spId = await getOrCreatePlayerId(db, leagueId, game.homeSP, homeTeamId, 'P');
        await db.from('games').update({ home_sp_id: spId }).eq('id', dbGame.id);
      }
      if (game.awaySP && awayTeamId) {
        const spId = await getOrCreatePlayerId(db, leagueId, game.awaySP, awayTeamId, 'P');
        await db.from('games').update({ away_sp_id: spId }).eq('id', dbGame.id);
      }

      await db.from('predictions').upsert(
        {
          game_id: dbGame.id,
          prediction_type: 'pre_game',
          predicted_winner: teamIdMap[result.predictedWinner],
          confidence: result.confidence,
          home_sp_fip: input.homeSPStats?.fip ?? null,
          away_sp_fip: input.awaySPStats?.fip ?? null,
          home_sp_xfip: input.homeSPStats?.xfip ?? null,
          away_sp_xfip: input.awaySPStats?.xfip ?? null,
          home_lineup_woba: input.homeTeamStats.woba,
          away_lineup_woba: input.awayTeamStats.woba,
          home_bullpen_fip: input.homeTeamStats.bullpenFip,
          away_bullpen_fip: input.awayTeamStats.bullpenFip,
          home_war_total: input.homeTeamStats.totalWar,
          away_war_total: input.awayTeamStats.totalWar,
          home_recent_form: input.homeRecentForm,
          away_recent_form: input.awayRecentForm,
          head_to_head_rate: h2h.wins + h2h.losses > 0
            ? h2h.wins / (h2h.wins + h2h.losses)
            : null,
          park_factor: input.parkFactor,
          home_elo: input.homeElo.elo,
          away_elo: input.awayElo.elo,
          home_sfr: input.homeTeamStats.sfr,
          away_sfr: input.awayTeamStats.sfr,
          model_version: process.env.ANTHROPIC_API_KEY ? 'v2.0-debate' : 'v1.5',
          reasoning: finalReasoning,
          factors: result.factors,
        },
        { onConflict: 'game_id,prediction_type' }
      );

      predictionsGenerated++;
      predictionSummaries.push({
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        predictedWinner: result.predictedWinner,
        confidence: result.confidence,
        homeWinProb: result.homeWinProb,
      });
      console.log(
        `[Pipeline] ${game.homeTeam} vs ${game.awayTeam}: ${result.predictedWinner} (${Math.round(result.homeWinProb * 100)}%)`
      );
    }
  }

  const durationMs = Date.now() - startTime;
  const pipelineResult: PipelineResult = {
    date: targetDate,
    gamesFound: games.length,
    predictionsGenerated,
    gamesSkipped,
    errors,
  };

  console.log(`[Pipeline] Done in ${(durationMs / 1000).toFixed(1)}s: ${predictionsGenerated} predictions, ${gamesSkipped} skipped, ${errors.length} errors`);

  // 실행 히스토리 기록
  await db.from('pipeline_runs').insert({
    run_date: targetDate,
    mode,
    status: errors.length > 0 ? (predictionsGenerated > 0 ? 'partial' : 'error') : 'success',
    games_found: games.length,
    predictions: predictionsGenerated,
    games_skipped: gamesSkipped,
    errors: errors.length > 0 ? JSON.stringify(errors) : '[]',
    duration_ms: durationMs,
    triggered_by: triggeredBy,
  }).then(null, (e: unknown) => console.error('[Pipeline] Failed to log run:', e));

  // Telegram 알림
  try {
    if (predictionsGenerated > 0) {
      await notifyPredictions(pipelineResult, predictionSummaries as any);
    }
    await notifyPipelineStatus(pipelineResult, durationMs);
  } catch (e) {
    console.error('[Pipeline] Telegram notification failed:', e);
  }

  return pipelineResult;
}

/**
 * 회고 에이전트용 과거 예측 히스토리 수집
 */
async function getPredictionHistory(
  db: DB,
  leagueId: number,
  homeTeam: string,
  awayTeam: string
): Promise<PredictionHistory> {
  const { data: predictions } = await db
    .from('predictions')
    .select('predicted_winner, confidence, is_correct, game:games!predictions_game_id_fkey(game_date, home_team_id, away_team_id)')
    .eq('prediction_type', 'pre_game')
    .not('is_correct', 'is', null)
    .order('game_id', { ascending: false })
    .limit(50);

  if (!predictions || predictions.length === 0) {
    return { totalPredictions: 0, correctPredictions: 0, recentResults: [], homeTeamAccuracy: null, awayTeamAccuracy: null, teamAccuracy: {} };
  }

  const total = predictions.length;
  const correct = predictions.filter((p: any) => p.is_correct).length;

  // 간소화: 상세 히스토리는 DB 조인이 복잡하므로 요약만
  return {
    totalPredictions: total,
    correctPredictions: correct,
    recentResults: [],
    homeTeamAccuracy: total >= 10 ? correct / total : null,
    awayTeamAccuracy: null,
    teamAccuracy: {},
  };
}

// teamId → TeamCode 역매핑
function reverseTeamMap(teamIdMap: Record<string, number>): Record<number, string> {
  const reverse: Record<number, string> = {};
  for (const [code, id] of Object.entries(teamIdMap)) {
    reverse[id] = code;
  }
  return reverse;
}

/**
 * verify 모드 결과 수집 (Telegram 알림용)
 */
async function getVerifyResults(
  db: DB,
  leagueId: number,
  date: string,
  teamIdMap: Record<string, number>
) {
  const idToCode = reverseTeamMap(teamIdMap);

  const { data: gamesData } = await db
    .from('games')
    .select('id, home_team_id, away_team_id, home_score, away_score, winner_team_id')
    .eq('league_id', leagueId)
    .eq('game_date', date)
    .eq('status', 'final');

  if (!gamesData) return [];

  const results = [];
  for (const game of gamesData) {
    if (!game.winner_team_id) continue;

    const { data: pred } = await db
      .from('predictions')
      .select('predicted_winner, is_correct')
      .eq('game_id', game.id)
      .eq('prediction_type', 'pre_game')
      .single();

    if (pred) {
      results.push({
        homeTeam: idToCode[game.home_team_id] || 'UNK',
        awayTeam: idToCode[game.away_team_id] || 'UNK',
        predictedWinner: idToCode[pred.predicted_winner] || 'UNK',
        actualWinner: idToCode[game.winner_team_id] || 'UNK',
        isCorrect: pred.is_correct ?? false,
        homeScore: game.home_score ?? 0,
        awayScore: game.away_score ?? 0,
      });
    }
  }

  return results;
}

/**
 * 경기 결과 기반 적중률 업데이트
 */
async function updateAccuracy(
  db: DB,
  leagueId: number,
  date: string
) {
  // 해당 날짜 종료된 경기의 예측 검증
  const { data: gamesData } = await db
    .from('games')
    .select('id, winner_team_id')
    .eq('league_id', leagueId)
    .eq('game_date', date)
    .eq('status', 'final');

  if (!gamesData) return;

  for (const game of gamesData) {
    if (!game.winner_team_id) continue;

    const { data: pred } = await db
      .from('predictions')
      .select('id, predicted_winner')
      .eq('game_id', game.id)
      .eq('prediction_type', 'pre_game')
      .single();

    if (pred) {
      await db
        .from('predictions')
        .update({
          is_correct: pred.predicted_winner === game.winner_team_id,
          actual_winner: game.winner_team_id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', pred.id);
    }
  }
}
