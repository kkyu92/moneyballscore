import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { toKSTDateString, KBO_STADIUM_COORDS } from '@moneyball/shared';
import type { TeamCode } from '@moneyball/shared';
import { fetchForecastWeather } from '../scrapers/weather';
import {
  fetchGames, fetchRecentForm, fetchHeadToHead, DEFAULT_PARK_FACTORS,
} from '../scrapers/kbo-official';
import { fetchNaverSchedule } from '../scrapers/naver-schedule';
import {
  fetchPitcherStats, fetchTeamStats, fetchEloRatings, findPitcher,
  FANCY_STATS_DEFAULTS,
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
import { buildSummaryPredictions, type SummaryRow } from './daily-summary';
import { shouldPredictGame, estimateNotificationTime } from './schedule';
import { decideModelVersion } from './model-version';
import { buildFinalReasoning } from './final-reasoning';
import { computeWinnerTeamId } from './winner-id';
import { buildAccuracyUpdates } from './accuracy-update';
import {
  computePredictionHistory,
  type PredictionHistoryRow,
} from './prediction-history';
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
      // supabase-js 는 INSERT 실패를 throw 안 하고 .error 로 리턴 — 사례 3
      // (predictions.model_version VARCHAR overflow silent) 재발 차단.
      const { error: insertErr } = await db.from('pipeline_runs').insert({
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
      if (insertErr) {
        console.error('[Pipeline] pipeline_runs insert error:', insertErr);
      }
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
    // GitHub Actions cron 이 동일 expression 을 드물게 2회 fire — announce_sent
    // flag 로 중복 Telegram 차단. 14일치 prefetch 도 이미 첫 run 에서 돌았으므로 skip.
    if (await isNotificationSent(db, targetDate, 'announce_sent')) {
      console.log(`[Pipeline] announce already sent for ${targetDate}, skipping`);
      return finish({ date: targetDate, gamesFound: 0, predictionsGenerated: 0, gamesSkipped: 0, errors });
    }

    let games: ScrapedGame[] = [];
    try { games = await fetchGames(targetDate); }
    catch (e) {
      errors.push(`fetchGames: ${e instanceof Error ? e.message : String(e)}`);
      return finish({ date: targetDate, gamesFound: 0, predictionsGenerated: 0, gamesSkipped: 0, errors });
    }
    try {
      await notifyAnnounce(targetDate, games, estimateNotificationTime(games));
      await markNotificationFlag(db, targetDate, 'announce_sent', {
        announce_sent_at: new Date().toISOString(),
      });
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[Pipeline] Retention cleanup failed:', msg);
      errors.push(`retention cleanup: ${msg}`);
    }

    try {
      const yesterday = getYesterdayKST(targetDate);
      const cleanup = await runPostviewDaily(yesterday);
      if (cleanup.processed > 0) {
        console.log(`[Pipeline] Morning postview cleanup: ${yesterday} processed=${cleanup.processed}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[Pipeline] Morning postview cleanup failed:', msg);
      errors.push(`morning postview cleanup: ${msg}`);
    }
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
        winner_team_id: computeWinnerTeamId(
          game.status, game.homeScore, game.awayScore, homeTeamId, awayTeamId,
        ),
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
    // GitHub Actions cron 이 동일 expression 을 드물게 2회 fire — results_sent
    // flag 로 중복 Telegram + compound 루프 재실행 차단.
    if (await isNotificationSent(db, targetDate, 'results_sent')) {
      console.log(`[Pipeline] verify already ran for ${targetDate}, skipping`);
      return finish({ date: targetDate, gamesFound: games.length, predictionsGenerated: 0, gamesSkipped: 0, errors });
    }

    await updateAccuracy(db, leagueId, targetDate, errors);

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
      // verifyResults.length === 0 이어도 flag 는 설정 — 재실행 차단이 목적.
      await markNotificationFlag(db, targetDate, 'results_sent', {
        results_sent_at: new Date().toISOString(),
        results_count: verifyResults.length,
      });
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
      // KBO API status 이상 케이스는 raw snapshot 동봉 — 재발 시 어느 필드
      // 때문인지 pipeline_runs.skipped_detail 만 봐도 특정 가능.
      const needsRaw = decision.reason === 'not_scheduled'
        || decision.reason === 'sp_unconfirmed';
      skippedDetail.push({
        game: `${g.awayTeam}v${g.homeTeam}@${g.gameTime}`,
        reason: decision.reason,
        ...(needsRaw && g.rawStatus ? { raw: g.rawStatus } : {}),
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

    // teamStats / eloRatings 미스 = silent fallback (cycle 60 lesson lineage).
    // fancy-stats 가 10팀 미만이면 line 374-380 에서 errors 박제됐지만, 단일
    // 팀 누락은 그 가드 통과 → 본 console.warn 으로 Sentry 가시화.
    const missing: string[] = [];
    if (!homeTeamStat) missing.push(`teamStats:${game.homeTeam}`);
    if (!awayTeamStat) missing.push(`teamStats:${game.awayTeam}`);
    if (!homeElo) missing.push(`elo:${game.homeTeam}`);
    if (!awayElo) missing.push(`elo:${game.awayTeam}`);
    if (missing.length > 0) {
      console.warn('[Pipeline] teamStats/elo silent fallback', {
        gameId: game.externalGameId,
        match: `${game.awayTeam}@${game.homeTeam}`,
        missing,
        teamStatsCount: teamStats.length,
        eloRatingsCount: eloRatings.length,
      });
    }

    const defaultTeamStats = {
      team: game.homeTeam as TeamCode,
      woba: FANCY_STATS_DEFAULTS.woba,
      bullpenFip: FANCY_STATS_DEFAULTS.fip,
      totalWar: 12,
      sfr: FANCY_STATS_DEFAULTS.sfr,
    };
    const defaultElo = {
      team: game.homeTeam as TeamCode,
      elo: FANCY_STATS_DEFAULTS.elo,
      winPct: FANCY_STATS_DEFAULTS.winPct,
    };

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
    // cycle 128 silent drift fix — buildFinalReasoning helper 가 finalHomeProb
    // 를 reasoning.homeWinProb 로 명시 박제 + 정량 원본을 quantitativeHomeWinProb
    // 분리. spread 패턴이 quantResult.homeWinProb 만 박제해 buildDailySummary
    // (`p.reasoning?.homeWinProb`) 가 debate verdict 무시한 quant 확률 표시하던
    // mismatch 차단.
    let finalReasoning = buildFinalReasoning({
      quantResult,
      finalHomeProb,
    });

    let debateSucceeded = false;
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
        finalReasoning = buildFinalReasoning({
          quantResult,
          finalHomeProb,
          debate: {
            homeArgument: debate.homeArgument, awayArgument: debate.awayArgument,
            calibration: debate.calibration, verdict: debate.verdict,
            quantitativeProb: debate.quantitativeProb, totalTokens: debate.totalTokens,
          },
        });
        debateSucceeded = true;
      } catch (e) {
        const debateErr = e instanceof Error ? e.message : String(e);
        console.error(`[Pipeline] Debate failed for ${game.homeTeam} vs ${game.awayTeam}:`, debateErr);
        errors.push(`Debate ${game.homeTeam}v${game.awayTeam}: ${debateErr}`);
      }
    }

    // cycle 127 silent drift fix — debate throw 시 model_version 강등.
    // 기존: ANTHROPIC_API_KEY 만 보고 'v2.0-debate' 박제 → /debug/model-comparison
    // 의 v1.6-pure vs v2.0-debate Brier 대조에서 정량 fallback row 가 v2.0
    // 라벨로 묻혀 분류 오류.
    const versionDecision = decideModelVersion({
      hasApiKey: !!process.env.ANTHROPIC_API_KEY,
      debateSucceeded,
    });

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
      model_version: versionDecision.model_version,
      debate_version: versionDecision.debate_version,
      scoring_rule: 'v1.7-revert',
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

    // games.weather 저장 (idempotent — 이미 있으면 skip). 예측과 같은 시점의
    // 예보 스냅샷을 영구 기록 — 관측 심화 (날씨-결과 상관 분석) 데이터 소스.
    const coords = KBO_STADIUM_COORDS[game.homeTeam as TeamCode];
    if (coords) {
      const hourStr = game.gameTime?.slice(0, 2);
      const hour = hourStr ? parseInt(hourStr, 10) : 18;
      const existing = await db
        .from('games')
        .select('weather')
        .eq('id', dbGameId)
        .single();
      if (!existing.data?.weather) {
        const snap = await fetchForecastWeather(coords.lat, coords.lng, targetDate, hour);
        if (snap) {
          await db.from('games').update({ weather: snap }).eq('id', dbGameId);
        }
      }
    }
  }

  // 하루 요약 알림 — daily_notifications flag 로 idempotent (Codex #6).
  // errors 패스 — silent fail 시 pipeline_runs.errors 에 박혀 다음 진단 가능.
  if (predictionsGenerated > 0) {
    await handleDailySummaryNotification(db, dbGameIds, targetDate, games, errors);
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
 * daily_notifications flag 체크 — 오늘 해당 알림 이미 발송했는지.
 * 동일 cron 이 2회 fire 하는 경우 중복 Telegram 차단용.
 */
type NotificationFlag = 'summary_sent' | 'announce_sent' | 'results_sent';

async function isNotificationSent(
  db: DB, date: string, flag: NotificationFlag,
): Promise<boolean> {
  const { data } = await db
    .from('daily_notifications')
    .select(flag).eq('run_date', date).maybeSingle();
  return !!(data as Record<string, unknown> | null)?.[flag];
}

/**
 * daily_notifications flag 설정. row 존재 시 update, 없으면 insert.
 * upsert 미사용 이유: 부분 payload 가 다른 flag 컬럼을 DEFAULT(false) 로
 * 덮어쓸 위험 회피 (예: announce row 가 기존 summary_sent=true 를 무효화).
 */
async function markNotificationFlag(
  db: DB, date: string, flag: NotificationFlag,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const { data: existing } = await db
    .from('daily_notifications')
    .select('run_date').eq('run_date', date).maybeSingle();

  if (existing) {
    await db.from('daily_notifications')
      .update({ [flag]: true, ...extra }).eq('run_date', date);
  } else {
    await db.from('daily_notifications')
      .insert({ run_date: date, [flag]: true, ...extra });
  }
}

/**
 * 하루 요약 Telegram 알림 idempotent 처리 (daily_notifications.summary_sent).
 * 마지막 조각 저장 시점에 전체 예측을 한 번에 전송. SP 늦확정으로 expected 가
 * 늘어도 summary_sent=true 면 재전송 차단.
 */
async function handleDailySummaryNotification(
  db: DB, dbGameIds: number[], date: string, games: ScrapedGame[],
  errors: string[] = [],
) {
  // 단계별 try/catch — silent fail 방지 (4/22~4/28 5/5 누락 사례)
  let stage = 'init';
  try {
    stage = 'expected-calc';
    const expected = games.filter(
      (g) => g.status !== 'final' && g.status !== 'postponed' && g.homeSP && g.awaySP,
    ).length;
    if (expected === 0) {
      console.log(`[Pipeline] summary skip: expected=0 (no SP-confirmed games)`);
      return;
    }

    stage = 'todayTotal-count';
    const { count: todayTotal } = await db
      .from('predictions')
      .select('*', { count: 'exact', head: true })
      .in('game_id', dbGameIds).eq('prediction_type', 'pre_game');

    if ((todayTotal ?? 0) < expected) {
      console.log(`[Pipeline] summary skip: todayTotal=${todayTotal} < expected=${expected}`);
      return;
    }

    stage = 'flag-check';
    if (await isNotificationSent(db, date, 'summary_sent')) {
      console.log(`[Pipeline] summary skip: already sent`);
      return;
    }

    stage = 'build-summary';
    const summary = await buildDailySummary(db, dbGameIds);
    if (summary.length === 0) {
      console.log(
        `[Pipeline] summary skip: built summary empty (todayTotal=${todayTotal} mismatch — silent drift guard, summary_sent 박제 회피)`,
      );
      return;
    }

    stage = 'notify-telegram';
    await notifyPredictions(
      {
        date, gamesFound: games.length,
        predictionsGenerated: todayTotal ?? 0,
        gamesSkipped: 0, errors: [],
      },
      summary,
    );

    stage = 'mark-flag';
    await markNotificationFlag(db, date, 'summary_sent', {
      sent_at: new Date().toISOString(),
      prediction_count: todayTotal,
    });
    console.log(`[Pipeline] summary sent successfully (n=${todayTotal})`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const errLine = `[SUMMARY_FAIL@${stage}] ${msg}`;
    console.error('[Pipeline] daily summary notification failed:', errLine);
    errors.push(errLine);
  }
}

/**
 * notifyPredictions 에 넘길 predictions 배열 구성 (DB 조회).
 *
 * cycle 142 silent drift fix — supabase `.error` 미체크 silent fail 차단.
 * 기존 `const { data } = await db.from(...)` 는 DB 오류 시 data=null →
 * `(data ?? []).map` 빈 배열 silent fallback → ghost summary notification +
 * summary_sent 플래그 박제 → 다음 fire `already sent` silent skip = 사용자
 * 무감지. `.error` destructure + 명시적 throw 로 catch 측 errors[] push +
 * 호출 site `summary.length === 0` 가드 추가.
 */
async function buildDailySummary(db: DB, dbGameIds: number[]) {
  const { data, error } = await db
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

  if (error) {
    throw new Error(`buildDailySummary select failed: ${error.message}`);
  }

  return buildSummaryPredictions(
    (data ?? []) as unknown as SummaryRow[],
  );
}

// cycle 133 silent drift fix — homeTeamAccuracy 시맨틱 decoupling.
// 기존: correct/total (전체 적중률) 을 homeTeamAccuracy 필드에 박제 →
// calibration-agent.ts:39 의 "홈팀 승리 예측 적중률" 시맨틱과 mismatch →
// LLM 이 전체 적중률을 홈팀 조건부 적중률로 오해. 본 fix 는 game.home_team_id /
// away_team_id 조인 후 predicted_winner === home_team_id 분기로 진짜 조건부
// 적중률 계산. 순수 헬퍼 computePredictionHistory 추출 (cycle 127/128 패턴).
async function getPredictionHistory(db: DB): Promise<PredictionHistory> {
  const { data: predictions } = await db
    .from('predictions')
    .select(`
      predicted_winner,
      is_correct,
      game:games!predictions_game_id_fkey(
        home_team_id,
        away_team_id
      )
    `)
    .eq('prediction_type', 'pre_game')
    .not('is_correct', 'is', null)
    .order('game_id', { ascending: false })
    .limit(50);

  return computePredictionHistory(
    (predictions ?? []) as unknown as PredictionHistoryRow[],
  );
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

  const finalGameIds = gamesData.filter((g) => g.winner_team_id).map((g) => g.id);
  if (finalGameIds.length === 0) return [];

  const { data: predRows } = await db
    .from('predictions')
    .select('game_id, predicted_winner, is_correct')
    .eq('prediction_type', 'pre_game')
    .in('game_id', finalGameIds);

  const predByGameId = new Map<number, PredRow>();
  for (const row of (predRows ?? []) as Array<PredRow & { game_id: number }>) {
    predByGameId.set(row.game_id, { predicted_winner: row.predicted_winner, is_correct: row.is_correct });
  }

  const results: VerifyResult[] = [];
  for (const game of gamesData) {
    if (!game.winner_team_id) continue;
    const pred = predByGameId.get(game.id);
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
        winner_team_id: computeWinnerTeamId(
          g.status, g.homeScore, g.awayScore, homeTeamId, awayTeamId,
        ),
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

async function updateAccuracy(
  db: DB,
  leagueId: number,
  date: string,
  errors: string[],
) {
  const { data: gamesData, error: gamesErr } = await db
    .from('games').select('id, winner_team_id')
    .eq('league_id', leagueId).eq('game_date', date).eq('status', 'final');
  if (gamesErr) {
    errors.push(`updateAccuracy games select: ${gamesErr.message}`);
    return;
  }
  if (!gamesData) return;

  const finalGames = (gamesData as Array<{ id: number; winner_team_id: number | null }>)
    .filter((g): g is { id: number; winner_team_id: number } => g.winner_team_id != null);
  if (finalGames.length === 0) return;

  const { data: predRows, error: predErr } = await db
    .from('predictions').select('id, game_id, predicted_winner')
    .eq('prediction_type', 'pre_game')
    .in('game_id', finalGames.map((g) => g.id));
  if (predErr) {
    errors.push(`updateAccuracy predictions select: ${predErr.message}`);
    return;
  }

  const predByGameId = new Map<number, { id: number; predicted_winner: number }>();
  for (const row of (predRows ?? []) as Array<{ id: number; game_id: number; predicted_winner: number }>) {
    predByGameId.set(row.game_id, { id: row.id, predicted_winner: row.predicted_winner });
  }

  const updates = buildAccuracyUpdates(finalGames, predByGameId, new Date().toISOString());
  const results = await Promise.all(
    updates.map(({ predId, payload }) =>
      db.from('predictions').update(payload).eq('id', predId)
        .then((res: { error: { message: string } | null }) => ({ predId, error: res.error })),
    ),
  );
  for (const { predId, error } of results) {
    if (error) errors.push(`updateAccuracy prediction id=${predId}: ${error.message}`);
  }
}
