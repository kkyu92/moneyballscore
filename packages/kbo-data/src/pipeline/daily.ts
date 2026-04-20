import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { toKSTDateString } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import {
  fetchGames, fetchRecentForm, fetchHeadToHead, DEFAULT_PARK_FACTORS,
} from '../scrapers/kbo-official';
import { fetchNaverSchedule } from '../scrapers/naver-schedule';
import {
  fetchPitcherStats, fetchTeamStats, fetchEloRatings, findPitcher,
} from '../scrapers/fancy-stats';
import { fetchBatterLeaders } from '../scrapers/fangraphs';
import { predict } from '../engine/predictor';
import {
  calculateRecentForm, calculateHeadToHead, type FinishedGame,
} from '../engine/form';
import { runDebate } from '../agents/debate';
import type { GameContext } from '../agents/types';
import type { PredictionHistory } from '../agents/calibration-agent';
import { updateCalibration, generateAgentMemories } from '../agents/retro';
import { runPostviewDaily } from './postview-daily';
import { shouldPredictGame, estimateNotificationTime } from './schedule';
import {
  notifyPredictions, notifyResults, notifyError,
  notifyPipelineStatus, notifyAnnounce,
} from '../notify/telegram';
import type {
  PredictionInput, PipelineResult, ScrapedGame, SkippedGame,
  PitcherStats, TeamStats, EloRating,
} from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

function createAdminClient(): DB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required',
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const CURRENT_SEASON = new Date().getFullYear();

function getYesterdayKST(date: string): string {
  const d = new Date(date + 'T00:00:00+09:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function getKBOLeagueId(db: DB): Promise<number> {
  const { data } = await db.from('leagues').select('id').eq('code', 'KBO').single();
  if (!data) throw new Error('KBO league not found in DB');
  return data.id;
}

async function getTeamIdMap(
  db: DB, leagueId: number,
): Promise<Record<TeamCode, number>> {
  const { data } = await db.from('teams').select('id, code').eq('league_id', leagueId);
  if (!data) return {} as Record<TeamCode, number>;
  const map: Partial<Record<TeamCode, number>> = {};
  for (const team of data) map[team.code as TeamCode] = team.id;
  return map as Record<TeamCode, number>;
}

async function getOrCreatePlayerId(
  db: DB, leagueId: number, name: string, teamId: number, position: string,
): Promise<number> {
  const { data: existing } = await db
    .from('players').select('id')
    .eq('league_id', leagueId).eq('name_ko', name).eq('team_id', teamId).single();
  if (existing) return existing.id;
  const { data: created } = await db
    .from('players')
    .insert({ league_id: leagueId, name_ko: name, team_id: teamId, position })
    .select('id').single();
  if (!created) throw new Error(`Failed to create player: ${name}`);
  return created.id;
}

export type PipelineMode = 'announce' | 'predict' | 'predict_final' | 'verify';

/**
 * PLAN_v5 Phase 2C — 통합 파이프라인 엔트리.
 *
 * 모드:
 * - announce (UTC 00 = KST 09): 오늘 편성 + 예상 알림 시각 Telegram
 * - predict (UTC 01-12 = KST 10-21): 매시간, 각 경기 시작 3h 전 개별 예측
 * - predict_final (UTC 13 = KST 22): 마지막 predict + gap 체크
 * - verify (UTC 14 = KST 23): accuracy 업데이트 + compound 루프
 *
 * 모든 exit 경로는 finish() helper 로 통과 — pipeline_runs 로그 보장.
 */
export async function runDailyPipeline(
  date?: string,
  mode: PipelineMode = 'predict',
  triggeredBy: 'cron' | 'manual' | 'api' = 'api',
): Promise<PipelineResult> {
  const startTime = Date.now();
  const targetDate = date || toKSTDateString();
  const db = createAdminClient();
  const errors: string[] = [];

  console.log(`[Pipeline] ${mode} mode for ${targetDate}`);

  // 모든 exit 경로가 통과 — pipeline_runs 로그 + (조건부) Telegram status (Codex #7)
  const finish = async (result: PipelineResult): Promise<PipelineResult> => {
    const durationMs = Date.now() - startTime;
    const status =
      result.errors.length > 0
        ? result.predictionsGenerated > 0 ? 'partial' : 'error'
        : 'success';
    try {
      await db.from('pipeline_runs').insert({
        run_date: targetDate, mode, status,
        games_found: result.gamesFound,
        predictions: result.predictionsGenerated,
        games_skipped: result.gamesSkipped,
        errors: result.errors.length > 0 ? JSON.stringify(result.errors) : '[]',
        skipped_detail:
          result.skippedDetail && result.skippedDetail.length > 0
            ? JSON.stringify(result.skippedDetail)
            : null,
        duration_ms: durationMs, triggered_by: triggeredBy,
      });
    } catch (e) {
      console.error('[Pipeline] pipeline_runs insert failed:', e);
    }

    // Telegram status 는 의미 있는 run 에만 — 매시간 spam 방지
    const shouldNotifyStatus =
      (mode === 'predict' && result.predictionsGenerated > 0) ||
      mode === 'predict_final' ||
      mode === 'verify';
    if (shouldNotifyStatus) {
      try { await notifyPipelineStatus(result, durationMs); }
      catch (e) { console.error('[Pipeline] notifyPipelineStatus failed:', e); }
    }
    return result;
  };

  // === announce mode (KST 09:00) ===
  if (mode === 'announce') {
    let games: ScrapedGame[] = [];
    try { games = await fetchGames(targetDate); }
    catch (e) {
      errors.push(`fetchGames: ${e instanceof Error ? e.message : String(e)}`);
      return finish({ date: targetDate, gamesFound: 0, predictionsGenerated: 0, gamesSkipped: 0, errors });
    }
    try {
      await notifyAnnounce(targetDate, games, estimateNotificationTime(games));
    } catch (e) {
      errors.push(`notifyAnnounce: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 14일치 일정 prefetch (Naver API 1회 호출) — 홈 empty-state 에서
    // "다음 경기 일정" 을 바로 찾을 수 있도록 games 테이블에 확보.
    // 실패해도 announce 전체 실패 아님 (errors 에만 기록).
    try {
      const leagueId = await getKBOLeagueId(db);
      const teamIdMap = await getTeamIdMap(db, leagueId);
      const prefetched = await prefetchSchedule(db, leagueId, teamIdMap, targetDate, 14);
      if (prefetched.error) {
        errors.push(`prefetchSchedule: ${prefetched.error}`);
      } else {
        console.log(`[Pipeline] Prefetched ${prefetched.upserted} games (${prefetched.range})`);
      }
    } catch (e) {
      errors.push(`prefetchSchedule: ${e instanceof Error ? e.message : String(e)}`);
    }

    return finish({ date: targetDate, gamesFound: games.length, predictionsGenerated: 0, gamesSkipped: 0, errors });
  }

  // predict / predict_final / verify 공통 setup
  let leagueId: number;
  let teamIdMap: Record<TeamCode, number>;
  try {
    leagueId = await getKBOLeagueId(db);
    teamIdMap = await getTeamIdMap(db, leagueId);
  } catch (e) {
    errors.push(`setup: ${e instanceof Error ? e.message : String(e)}`);
    return finish({ date: targetDate, gamesFound: 0, predictionsGenerated: 0, gamesSkipped: 0, errors });
  }

  // 첫 predict cron 전용 cleanup (Codex #5) — UTC 01 = KST 10
  const isFirstPredictRun = mode === 'predict' && new Date().getUTCHours() === 1;
  if (isFirstPredictRun) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: memCount } = await db.from('agent_memories')
        .delete({ count: 'exact' }).lt('created_at', thirtyDaysAgo);
      const { count: logCount } = await db.from('validator_logs')
        .delete({ count: 'exact' }).lt('created_at', thirtyDaysAgo);
      if ((memCount ?? 0) > 0 || (logCount ?? 0) > 0) {
        console.log(`[Pipeline] Retention cleanup: agent_memories=${memCount ?? 0}, validator_logs=${logCount ?? 0}`);
      }
    } catch (e) { console.warn('[Pipeline] Retention cleanup failed:', e); }

    try {
      const yesterday = getYesterdayKST(targetDate);
      const cleanup = await runPostviewDaily(yesterday);
      if (cleanup.processed > 0) {
        console.log(`[Pipeline] Morning postview cleanup: ${yesterday} processed=${cleanup.processed}`);
      }
    } catch (e) { console.warn('[Pipeline] Morning postview cleanup failed:', e); }
  }

  // fetchGames
  let games: ScrapedGame[];
  try {
    games = await fetchGames(targetDate);
    console.log(`[Pipeline] ${games.length} games found`);
  } catch (e) {
    errors.push(`fetchGames: ${e instanceof Error ? e.message : String(e)}`);
    return finish({ date: targetDate, gamesFound: 0, predictionsGenerated: 0, gamesSkipped: 0, errors });
  }

  if (games.length === 0) {
    return finish({ date: targetDate, gamesFound: 0, predictionsGenerated: 0, gamesSkipped: 0, errors });
  }

  // games upsert + gameIdMap 배치 (Codex #10)
  const gamesPayload = games
    .map((game) => {
      const homeTeamId = teamIdMap[game.homeTeam];
      const awayTeamId = teamIdMap[game.awayTeam];
      if (!homeTeamId || !awayTeamId) {
        errors.push(`Unknown team: ${game.homeTeam} or ${game.awayTeam}`);
        return null;
      }
      return {
        league_id: leagueId, game_date: game.date, game_time: game.gameTime,
        home_team_id: homeTeamId, away_team_id: awayTeamId,
        stadium: game.stadium, status: game.status,
        home_score: game.homeScore ?? null, away_score: game.awayScore ?? null,
        winner_team_id:
          game.status === 'final' && game.homeScore != null && game.awayScore != null
            ? game.homeScore > game.awayScore ? homeTeamId : awayTeamId
            : null,
        external_game_id: game.externalGameId,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const { data: upserted, error: upsertErr } = await db
    .from('games')
    .upsert(gamesPayload, { onConflict: 'league_id,external_game_id' })
    .select('id, external_game_id');

  if (upsertErr) {
    errors.push(`games upsert: ${upsertErr.message}`);
    return finish({ date: targetDate, gamesFound: games.length, predictionsGenerated: 0, gamesSkipped: games.length, errors });
  }

  const gameIdMap = new Map<string, number>(
    (upserted ?? []).map((g: { id: number; external_game_id: string }) => [g.external_game_id, g.id]),
  );
  const dbGameIds = Array.from(gameIdMap.values());

  // === verify mode (KST 23:00) ===
  if (mode === 'verify') {
    await updateAccuracy(db, leagueId, targetDate);

    try {
      await updateCalibration();
      await generateAgentMemories(targetDate);
      console.log('[Pipeline] Calibration + Agent memories updated');
    } catch (e) {
      errors.push(`compound: ${e instanceof Error ? e.message : String(e)}`);
    }

    const verifyResults = await getVerifyResults(db, leagueId, targetDate, teamIdMap);
    try {
      if (verifyResults.length > 0) {
        await notifyResults(targetDate, verifyResults);
      }
    } catch (e) { console.error('[Pipeline] notifyResults failed:', e); }

    return finish({ date: targetDate, gamesFound: games.length, predictionsGenerated: 0, gamesSkipped: 0, errors });
  }

  // === predict / predict_final ===
  // existing pre_game predictions 배치 조회
  const { data: existing } = await db
    .from('predictions').select('game_id')
    .eq('prediction_type', 'pre_game').in('game_id', dbGameIds);
  const existingSet = new Set(
    (existing ?? []).map((e: { game_id: number }) => e.game_id),
  );

  // windowTargets 계산 + 스킵 사유 수집. reason 버리지 말고 pipeline_runs 에
  // 보존 → 사후 "왜 이 경기가 예측 안 됐나" 즉각 판독 가능.
  const nowMs = Date.now();
  const windowTargets: ScrapedGame[] = [];
  const skippedDetail: SkippedGame[] = [];
  for (const g of games) {
    const dbId = gameIdMap.get(g.externalGameId) ?? null;
    const decision = shouldPredictGame(g, existingSet, dbId, nowMs);
    if (decision.shouldPredict) {
      windowTargets.push(g);
    } else {
      skippedDetail.push({
        game: `${g.awayTeam}v${g.homeTeam}@${g.gameTime}`,
        reason: decision.reason,
      });
    }
  }

  let predictionsGenerated = 0;

  // windowTargets 0 + predict mode → early return (Fancy Stats 불필요)
  // predict_final 은 gap 체크 위해 계속 진행
  if (windowTargets.length === 0 && mode === 'predict') {
    return finish({
      date: targetDate, gamesFound: games.length,
      predictionsGenerated: 0, gamesSkipped: games.length, errors, skippedDetail,
    });
  }

  // Fancy Stats / FanGraphs — windowTargets 있을 때만
  let pitcherStats: PitcherStats[] = [];
  let teamStats: TeamStats[] = [];
  let eloRatings: EloRating[] = [];

  if (windowTargets.length > 0) {
    console.log('[Pipeline] Fetching Fancy Stats...');
    [pitcherStats, teamStats, eloRatings] = await Promise.all([
      fetchPitcherStats(CURRENT_SEASON).catch((e) => { errors.push(`FancyStats pitchers: ${e}`); return []; }),
      fetchTeamStats(CURRENT_SEASON).catch((e) => { errors.push(`FancyStats teams: ${e}`); return []; }),
      fetchEloRatings(CURRENT_SEASON).catch((e) => { errors.push(`FancyStats elo: ${e}`); return []; }),
    ]);

    const scraperIssues: string[] = [];
    if (pitcherStats.length === 0) scraperIssues.push('Fancy Stats pitcher 0명');
    if (teamStats.length < 10) scraperIssues.push(`Fancy Stats team ${teamStats.length}팀 (기대 10)`);
    if (eloRatings.length < 10) scraperIssues.push(`Fancy Stats Elo ${eloRatings.length}팀 (기대 10)`);
    if (scraperIssues.length > 0) {
      const msg = `셀렉터 드리프트 의심: ${scraperIssues.join(', ')}`;
      errors.push(msg);
      try { await notifyError('daily-pipeline SCRAPER', msg); } catch {}
    }

    console.log('[Pipeline] Fetching FanGraphs...');
    const fgBatters = await fetchBatterLeaders(CURRENT_SEASON).catch((e) => {
      errors.push(`FanGraphs: ${e}`); return [];
    });
    for (const fg of fgBatters) {
      const ts = teamStats.find((t) => t.team === fg.team);
      if (ts) { ts.wrcPlus = fg.wrcPlus; ts.iso = fg.iso; }
    }

    for (const ts of teamStats) {
      const teamId = teamIdMap[ts.team];
      if (!teamId) continue;
      const elo = eloRatings.find((e) => e.team === ts.team);
      await db.from('team_season_stats').upsert({
        team_id: teamId, season: CURRENT_SEASON,
        team_woba: ts.woba, team_wrc_plus: ts.wrcPlus ?? null,
        bullpen_fip: ts.bullpenFip, sfr: ts.sfr,
        elo_rating: elo?.elo ?? null, elo_win_pct: elo?.winPct ?? null,
        total_war: ts.totalWar, last_synced: new Date().toISOString(),
      }, { onConflict: 'team_id,season' });
    }
  }

  // windowTargets predict 루프
  const yesterday = getYesterdayKST(targetDate);
  for (const game of windowTargets) {
    const dbGameId = gameIdMap.get(game.externalGameId);
    if (!dbGameId) continue;

    const homeTeamStat = teamStats.find((t) => t.team === game.homeTeam);
    const awayTeamStat = teamStats.find((t) => t.team === game.awayTeam);
    const homeElo = eloRatings.find((e) => e.team === game.homeTeam);
    const awayElo = eloRatings.find((e) => e.team === game.awayTeam);

    const defaultTeamStats = {
      team: game.homeTeam as TeamCode, woba: 0.320, bullpenFip: 4.00, totalWar: 12, sfr: 0,
    };
    const defaultElo = { team: game.homeTeam as TeamCode, elo: 1500, winPct: 0.5 };

    // Phase 2.5 — DB 기반 recent form + h2h (asOfDate 이전 final 경기만).
    // 당일 낮경기 결과는 status='final' 되어도 game_date=오늘 이라 yesterday
    // 필터에서 자동 제외. KBO 스크래핑 대비 구조적으로 누수 없음.
    const homeTeamIdForForm = teamIdMap[game.homeTeam];
    const awayTeamIdForForm = teamIdMap[game.awayTeam];
    const { data: recentFinalGames } = await db
      .from('games')
      .select('home_team_id, away_team_id, winner_team_id')
      .eq('status', 'final')
      .lt('game_date', yesterday)
      .or(
        `home_team_id.eq.${homeTeamIdForForm},` +
        `away_team_id.eq.${homeTeamIdForForm},` +
        `home_team_id.eq.${awayTeamIdForForm},` +
        `away_team_id.eq.${awayTeamIdForForm}`,
      )
      .order('game_date', { ascending: false })
      .limit(50);

    const finished: FinishedGame[] = (recentFinalGames ?? []) as FinishedGame[];
    let homeForm = calculateRecentForm(finished, homeTeamIdForForm, 10);
    let awayForm = calculateRecentForm(finished, awayTeamIdForForm, 10);
    let h2h = calculateHeadToHead(finished, homeTeamIdForForm, awayTeamIdForForm);

    // DB 데이터 부족 시 (시즌 초기 / 운영 첫 주) KBO 스크래핑 fallback
    if (homeForm === null) {
      homeForm = await fetchRecentForm(game.homeTeam, CURRENT_SEASON, 10).catch(() => 0.5);
    }
    if (awayForm === null) {
      awayForm = await fetchRecentForm(game.awayTeam, CURRENT_SEASON, 10).catch(() => 0.5);
    }
    if (h2h.wins + h2h.losses === 0) {
      h2h = await fetchHeadToHead(game.homeTeam, game.awayTeam, CURRENT_SEASON)
        .catch(() => ({ wins: 0, losses: 0 }));
    }

    const input: PredictionInput = {
      game,
      homeSPStats: findPitcher(pitcherStats, game.homeSP!, game.homeTeam),
      awaySPStats: findPitcher(pitcherStats, game.awaySP!, game.awayTeam),
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

    let finalWinner = quantResult.predictedWinner;
    let finalHomeProb = quantResult.homeWinProb;
    let finalConfidence = quantResult.confidence;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalReasoning: any = quantResult;

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const gameContext: GameContext = {
          game: input.game,
          homeSPStats: input.homeSPStats, awaySPStats: input.awaySPStats,
          homeTeamStats: input.homeTeamStats, awayTeamStats: input.awayTeamStats,
          homeElo: input.homeElo, awayElo: input.awayElo,
          homeRecentForm: input.homeRecentForm, awayRecentForm: input.awayRecentForm,
          headToHead: input.headToHead, parkFactor: input.parkFactor,
        };
        const history = await getPredictionHistory(db);
        const debate = await runDebate(gameContext, quantResult.homeWinProb, history);

        finalWinner = debate.verdict.predictedWinner;
        finalHomeProb = debate.verdict.homeWinProb;
        finalConfidence = debate.verdict.confidence;
        finalReasoning = {
          ...quantResult,
          debate: {
            homeArgument: debate.homeArgument, awayArgument: debate.awayArgument,
            calibration: debate.calibration, verdict: debate.verdict,
            quantitativeProb: debate.quantitativeProb, totalTokens: debate.totalTokens,
          },
        };
      } catch (e) {
        const debateErr = e instanceof Error ? e.message : String(e);
        console.error(`[Pipeline] Debate failed for ${game.homeTeam} vs ${game.awayTeam}:`, debateErr);
        errors.push(`Debate ${game.homeTeam}v${game.awayTeam}: ${debateErr}`);
      }
    }

    const result = {
      ...quantResult,
      predictedWinner: finalWinner, homeWinProb: finalHomeProb, confidence: finalConfidence,
    };

    const homeTeamId = teamIdMap[game.homeTeam];
    const awayTeamId = teamIdMap[game.awayTeam];
    if (game.homeSP && homeTeamId) {
      const spId = await getOrCreatePlayerId(db, leagueId, game.homeSP, homeTeamId, 'P');
      await db.from('games').update({ home_sp_id: spId }).eq('id', dbGameId);
    }
    if (game.awaySP && awayTeamId) {
      const spId = await getOrCreatePlayerId(db, leagueId, game.awaySP, awayTeamId, 'P');
      await db.from('games').update({ away_sp_id: spId }).eq('id', dbGameId);
    }

    const payload = {
      game_id: dbGameId,
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
      head_to_head_rate:
        h2h.wins + h2h.losses > 0 ? h2h.wins / (h2h.wins + h2h.losses) : null,
      park_factor: input.parkFactor,
      home_elo: input.homeElo.elo,
      away_elo: input.awayElo.elo,
      home_sfr: input.homeTeamStats.sfr,
      away_sfr: input.awayTeamStats.sfr,
      model_version: process.env.ANTHROPIC_API_KEY ? 'v2.0-debate' : 'v1.5',
      debate_version: process.env.ANTHROPIC_API_KEY ? 'v2-persona4' : null,
      scoring_rule: 'v1.5',
      reasoning: finalReasoning,
      factors: result.factors,
      predicted_at: new Date().toISOString(),
    };

    // INSERT with UNIQUE(game_id, prediction_type) — race 시 23505 catch (Codex #1)
    const insertResult = await db.from('predictions').insert(payload).select('id');

    if (insertResult.error) {
      if (insertResult.error.code === '23505') {
        // 다른 cron 이 먼저 저장 — first-write-wins 성공
        continue;
      }
      const errMsg = `predictions insert ${game.homeTeam}v${game.awayTeam}: ${insertResult.error.message}`;
      console.error(`[Pipeline] ${errMsg}`);
      errors.push(errMsg);
      continue;
    }

    predictionsGenerated++;
    console.log(
      `[Pipeline] ${game.homeTeam} vs ${game.awayTeam}: ${result.predictedWinner} (${Math.round(result.homeWinProb * 100)}%)`,
    );
  }

  // 하루 요약 알림 — daily_notifications flag 로 idempotent (Codex #6)
  if (predictionsGenerated > 0) {
    await handleDailySummaryNotification(db, dbGameIds, targetDate, games);
  }

  // gap 감지 (predict_final mode 전용, Codex #9)
  if (mode === 'predict_final') {
    const expected = games.filter(
      (g) => g.status !== 'final' && g.status !== 'postponed' && g.homeSP && g.awaySP,
    ).length;
    const { count: totalToday } = await db
      .from('predictions')
      .select('*', { count: 'exact', head: true })
      .in('game_id', dbGameIds).eq('prediction_type', 'pre_game');
    const gap = expected - (totalToday ?? 0);
    if (gap > 0) {
      const msg =
        `예측 누락 ${gap}경기 (expected=${expected}, total=${totalToday})`;
      errors.push(`[GAP] ${msg}`);
      try { await notifyError('daily-pipeline GAP', msg); } catch {}
    }

    // SP 미확정 경기 전용 경고 — expected 계산에서 빠지지만 사용자 관점에선
    // 편성된 경기라 "왜 예측 없지?" 의문 유발. 운영자에게 명시 통보.
    const unconfirmed = games.filter(
      (g) =>
        g.status !== 'final' &&
        g.status !== 'postponed' &&
        (!g.homeSP || !g.awaySP),
    );
    if (unconfirmed.length > 0) {
      const list = unconfirmed
        .map((g) => `${g.awayTeam}v${g.homeTeam}@${g.gameTime}`)
        .join(', ');
      const msg =
        `선발 미확정 ${unconfirmed.length}경기 — 예측 생성 불가 (${list})`;
      errors.push(`[SP_UNCONFIRMED] ${msg}`);
      try { await notifyError('daily-pipeline SP_UNCONFIRMED', msg); } catch {}
    }
  }

  return finish({
    date: targetDate, gamesFound: games.length,
    predictionsGenerated,
    gamesSkipped: games.length - predictionsGenerated,
    errors, skippedDetail,
  });
}

/**
 * 하루 요약 Telegram 알림 idempotent 처리 (daily_notifications flag).
 * 마지막 조각 저장 시점에 전체 예측을 한 번에 전송. SP 늦확정으로 expected 가
 * 늘어도 summary_sent=true 면 재전송 차단.
 */
async function handleDailySummaryNotification(
  db: DB, dbGameIds: number[], date: string, games: ScrapedGame[],
) {
  try {
    const expected = games.filter(
      (g) => g.status !== 'final' && g.status !== 'postponed' && g.homeSP && g.awaySP,
    ).length;
    if (expected === 0) return;

    const { count: todayTotal } = await db
      .from('predictions')
      .select('*', { count: 'exact', head: true })
      .in('game_id', dbGameIds).eq('prediction_type', 'pre_game');

    if ((todayTotal ?? 0) < expected) return;

    const { data: marker } = await db
      .from('daily_notifications')
      .select('summary_sent').eq('run_date', date).maybeSingle();
    if (marker?.summary_sent) return;

    const summary = await buildDailySummary(db, dbGameIds);
    await notifyPredictions(
      {
        date, gamesFound: games.length,
        predictionsGenerated: todayTotal ?? 0,
        gamesSkipped: 0, errors: [],
      },
      summary,
    );

    await db.from('daily_notifications').upsert({
      run_date: date, summary_sent: true,
      sent_at: new Date().toISOString(),
      prediction_count: todayTotal,
    });
  } catch (e) {
    console.error('[Pipeline] daily summary notification failed:', e);
  }
}

/**
 * notifyPredictions 에 넘길 predictions 배열 구성 (DB 조회).
 */
async function buildDailySummary(db: DB, dbGameIds: number[]) {
  const { data } = await db
    .from('predictions')
    .select(`
      confidence, reasoning,
      winner:teams!predictions_predicted_winner_fkey(code),
      game:games!predictions_game_id_fkey(
        home_team:teams!games_home_team_id_fkey(code),
        away_team:teams!games_away_team_id_fkey(code)
      )
    `)
    .eq('prediction_type', 'pre_game').in('game_id', dbGameIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((p: any) => ({
    homeTeam: p.game?.home_team?.code as TeamCode,
    awayTeam: p.game?.away_team?.code as TeamCode,
    predictedWinner: p.winner?.code as TeamCode,
    confidence: p.confidence,
    homeWinProb: p.reasoning?.homeWinProb ?? 0.5,
  }));
}

async function getPredictionHistory(db: DB): Promise<PredictionHistory> {
  const { data: predictions } = await db
    .from('predictions')
    .select('predicted_winner, confidence, is_correct')
    .eq('prediction_type', 'pre_game')
    .not('is_correct', 'is', null)
    .order('game_id', { ascending: false })
    .limit(50);

  if (!predictions || predictions.length === 0) {
    return {
      totalPredictions: 0, correctPredictions: 0, recentResults: [],
      homeTeamAccuracy: null, awayTeamAccuracy: null, teamAccuracy: {},
    };
  }

  const total = predictions.length;
  const correct = predictions.filter(
    (p: { is_correct: boolean | null }) => p.is_correct,
  ).length;

  return {
    totalPredictions: total, correctPredictions: correct, recentResults: [],
    homeTeamAccuracy: total >= 10 ? correct / total : null,
    awayTeamAccuracy: null, teamAccuracy: {},
  };
}

function reverseTeamMap(teamIdMap: Record<string, number>): Record<number, string> {
  const reverse: Record<number, string> = {};
  for (const [code, id] of Object.entries(teamIdMap)) reverse[id] = code;
  return reverse;
}

async function getVerifyResults(
  db: DB, leagueId: number, date: string, teamIdMap: Record<string, number>,
) {
  const idToCode = reverseTeamMap(teamIdMap);

  const { data: gamesData } = await db
    .from('games')
    .select('id, home_team_id, away_team_id, home_score, away_score, winner_team_id')
    .eq('league_id', leagueId).eq('game_date', date).eq('status', 'final');

  if (!gamesData) return [];

  interface PredRow { predicted_winner: number; is_correct: boolean | null; }
  interface VerifyResult {
    homeTeam: TeamCode; awayTeam: TeamCode;
    predictedWinner: TeamCode; actualWinner: TeamCode;
    isCorrect: boolean; homeScore: number; awayScore: number;
  }

  const results: VerifyResult[] = [];
  for (const game of gamesData) {
    if (!game.winner_team_id) continue;
    const { data: pred } = await db
      .from('predictions')
      .select('predicted_winner, is_correct')
      .eq('game_id', game.id).eq('prediction_type', 'pre_game')
      .single<PredRow>();
    if (pred) {
      results.push({
        homeTeam: (idToCode[game.home_team_id] || 'UNK') as TeamCode,
        awayTeam: (idToCode[game.away_team_id] || 'UNK') as TeamCode,
        predictedWinner: (idToCode[pred.predicted_winner] || 'UNK') as TeamCode,
        actualWinner: (idToCode[game.winner_team_id] || 'UNK') as TeamCode,
        isCorrect: pred.is_correct ?? false,
        homeScore: game.home_score ?? 0,
        awayScore: game.away_score ?? 0,
      });
    }
  }
  return results;
}

/**
 * Naver API 로 14일치 일정 prefetch → games 테이블 upsert.
 *
 * 목적: 홈 empty-state "다음 경기 일정" 이 DB 에서 즉시 찾을 수 있도록.
 * 기존 fetchGames (KBO 공식) 는 단일 날짜만 받아 14회 호출 필요한데,
 * Naver API 는 fromDate-toDate 한 번에 가능.
 *
 * upsert onConflict=league_id,external_game_id → 기존 row 가 있으면 status·
 * score 만 patch (KBO 공식이 덮어쓴 후라도 일정 자체는 덮어쓰지 않음).
 */
async function prefetchSchedule(
  db: DB,
  leagueId: number,
  teamIdMap: Record<TeamCode, number>,
  startDate: string,
  days: number,
): Promise<{ upserted: number; range: string; error: string | null }> {
  // UTC 정오 앵커로 DST/타임존 영향 제거 + setUTCDate 로 순수 일수 가산.
  const end = new Date(`${startDate}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + days - 1);
  const fromStr = startDate;
  const toStr = end.toISOString().slice(0, 10);

  let scheduled: ScrapedGame[];
  try {
    // fields=all — basic 응답에는 stadium 등이 누락되어 UI 폴백 필요.
    // all 이 응답 크기 3~4배지만 일별 10경기 * 14일 = 140건이라 무시 가능.
    scheduled = await fetchNaverSchedule(fromStr, toStr, 'all');
  } catch (e) {
    return {
      upserted: 0,
      range: `${fromStr} ~ ${toStr}`,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  if (scheduled.length === 0) {
    return { upserted: 0, range: `${fromStr} ~ ${toStr}`, error: null };
  }

  const payload = scheduled
    .map((g) => {
      const homeTeamId = teamIdMap[g.homeTeam];
      const awayTeamId = teamIdMap[g.awayTeam];
      if (!homeTeamId || !awayTeamId) return null;
      return {
        league_id: leagueId,
        game_date: g.date,
        game_time: g.gameTime,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        stadium: g.stadium,
        status: g.status,
        home_score: g.homeScore ?? null,
        away_score: g.awayScore ?? null,
        winner_team_id:
          g.status === 'final' && g.homeScore != null && g.awayScore != null
            ? g.homeScore > g.awayScore ? homeTeamId : awayTeamId
            : null,
        external_game_id: g.externalGameId,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (payload.length === 0) {
    return { upserted: 0, range: `${fromStr} ~ ${toStr}`, error: null };
  }

  const { error } = await db
    .from('games')
    .upsert(payload, { onConflict: 'league_id,external_game_id' });

  if (error) {
    return {
      upserted: 0,
      range: `${fromStr} ~ ${toStr}`,
      error: error.message,
    };
  }
  return { upserted: payload.length, range: `${fromStr} ~ ${toStr}`, error: null };
}

async function updateAccuracy(db: DB, leagueId: number, date: string) {
  const { data: gamesData } = await db
    .from('games').select('id, winner_team_id')
    .eq('league_id', leagueId).eq('game_date', date).eq('status', 'final');
  if (!gamesData) return;

  for (const game of gamesData) {
    if (!game.winner_team_id) continue;
    const { data: pred } = await db
      .from('predictions').select('id, predicted_winner')
      .eq('game_id', game.id).eq('prediction_type', 'pre_game').single();
    if (pred) {
      await db.from('predictions').update({
        is_correct: pred.predicted_winner === game.winner_team_id,
        actual_winner: game.winner_team_id,
        verified_at: new Date().toISOString(),
      }).eq('id', pred.id);
    }
  }
}
