// MLB 파이프라인 오케스트레이터
//
// Plan C Task 2 — MLB 7 mode 실행 + silent drift alert 연동.
// mlb_statsapi_scrape: fetchMlbSchedule → games DB upsert (league='mlb').
// mlb_fancy_scrape: fetchFangraphsMlbTeams → mlb_team_stats upsert (cycle 1985 wiring — 스크래퍼는
//   이미 구현/테스트됨, 이전엔 pipeline 미연결 stub 이었음).
// mlb_savant_scrape: fetchSavantTeamStatcast → mlb_team_stats upsert (동일 cycle 1985 wiring).
// mlb_predict_final: computeMlbProbability → predictions DB insert.
// mlb_combined_notify: Telegram combined 메시지 (mlb_combined_notify route 통해 발송).
// mlb_shadow_train: trainShadowWeights → milestone check + walk_forward_brier insert.
// mlb_walk_forward_measure: computeBrier → walk_forward_brier insert.
//
// packages/kbo-data 는 apps/moneyball 를 import 못함 → mlb_combined_notify
// stub 처리 (API route 에서 직접 처리).

import { createClient } from '@supabase/supabase-js';
import { fetchMlbSchedule } from '../scrapers/statsapi-mlb';
import { fetchFangraphsMlbTeams } from '../scrapers/fangraphs-mlb';
import { fetchSavantTeamStatcast } from '../scrapers/baseball-savant';
import { computeMlbProbability } from '../factors/mlb-base';
import {
  trainShadowWeights,
  computeBrier,
  MILESTONE_TRIGGERS,
  type TrainingSample,
  type BrierInput,
} from '../factors/mlb-shadow-c';
import {
  shouldAlertSilentDrift,
  captureSilentDriftAlert,
} from './silent-drift-alert';
import { ELO_NEUTRAL, MLB_TEAMS, MLB_SCORING_RULE } from '@moneyball/shared';
import { DB_CONSTRAINTS } from './db-constraints';

// mlb_predict_final 실측 데이터 fallback 기본값 — mlb_team_stats row 부재(스크래퍼 미가동/미커버 팀) 시에만 사용.
// cycle 2057 이전엔 이 값들이 항상, 무조건 쓰였음 (모든 MLB 예측 home_win_prob 고정 0.556 — 사례 20).
const MLB_STAT_DEFAULTS = {
  woba: 0.320,
  fip: 4.0,
  xfip: 4.0,
  war: 0,
  xwoba: 0.320,
  barrelPct: 8,
} as const;

interface MlbTeamStatsRow {
  team_code: string;
  woba: number | null;
  fip: number | null;
  xfip: number | null;
  war: number | null;
  xwoba: number | null;
  barrel_pct: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = ReturnType<typeof createClient<any, any, any>>;

export type MlbPipelineMode =
  | 'mlb_statsapi_scrape'
  | 'mlb_fancy_scrape'
  | 'mlb_savant_scrape'
  | 'mlb_predict_final'
  | 'mlb_combined_notify'
  | 'mlb_shadow_train'
  | 'mlb_walk_forward_measure';

export interface MlbPipelineResult {
  mode: MlbPipelineMode;
  date: string;
  games_found: number;
  rows_inserted: number;
  errors: string[];
  triggered_by: string;
}

const MLB_MODES = new Set<MlbPipelineMode>([
  'mlb_statsapi_scrape',
  'mlb_fancy_scrape',
  'mlb_savant_scrape',
  'mlb_predict_final',
  'mlb_combined_notify',
  'mlb_shadow_train',
  'mlb_walk_forward_measure',
]);

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

// ─────────────────────────────────────────────
// mlb_statsapi_scrape
// ─────────────────────────────────────────────
async function runStatsApiScrape(db: DB, date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  const errors: string[] = [];
  let games: Awaited<ReturnType<typeof fetchMlbSchedule>> = [];

  try {
    games = await fetchMlbSchedule(date);
  } catch (e) {
    errors.push(`fetchMlbSchedule: ${e instanceof Error ? e.message : String(e)}`);
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  if (games.length === 0) {
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const rows = games.map((g) => ({
    league: 'mlb',
    external_game_id: String(g.gamePk),
    game_date: date,
    game_datetime_utc: g.gameDateUtc.toISOString(),
    home_team_code: g.homeTeam,
    away_team_code: g.awayTeam,
    status: g.status,
    home_score: g.homeScore ?? null,
    away_score: g.awayScore ?? null,
  }));

  const { error } = await db
    .from('mlb_schedule')
    .upsert(rows, { onConflict: DB_CONSTRAINTS.mlbGames });

  if (error) {
    errors.push(`mlb_schedule upsert: ${error.message}`);
    return { gamesFound: games.length, rowsInserted: 0, errors };
  }

  return { gamesFound: games.length, rowsInserted: rows.length, errors };
}

// ─────────────────────────────────────────────
// mlb_fancy_scrape
// ─────────────────────────────────────────────
async function runFancyScrape(db: DB, date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  const errors: string[] = [];
  const season = parseInt(date.slice(0, 4), 10);

  let teams: Awaited<ReturnType<typeof fetchFangraphsMlbTeams>> = [];
  try {
    teams = await fetchFangraphsMlbTeams(season);
  } catch (e) {
    errors.push(`fetchFangraphsMlbTeams: ${e instanceof Error ? e.message : String(e)}`);
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  if (teams.length === 0) {
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const now = new Date().toISOString();
  const rows = teams.map((t) => ({
    team_code: t.teamCode,
    season,
    woba: t.woba,
    fip: t.fip,
    xfip: t.xfip,
    war: t.war,
    ld_pct: t.ldPct,
    gb_pct: t.gbPct,
    fb_pct: t.fbPct,
    iffb_pct: t.iffbPct,
    hr_fb_pct: t.hrFbPct,
    pull_pct: t.pullPct,
    cent_pct: t.centPct,
    oppo_pct: t.oppoPct,
    fancy_synced_at: now,
  }));

  const { error } = await db
    .from('mlb_team_stats')
    .upsert(rows, { onConflict: DB_CONSTRAINTS.mlbTeamStats });

  if (error) {
    errors.push(`mlb_team_stats upsert (fancy): ${error.message}`);
    return { gamesFound: teams.length, rowsInserted: 0, errors };
  }

  return { gamesFound: teams.length, rowsInserted: rows.length, errors };
}

// ─────────────────────────────────────────────
// mlb_savant_scrape
// ─────────────────────────────────────────────
async function runSavantScrape(db: DB, date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  const errors: string[] = [];
  const season = parseInt(date.slice(0, 4), 10);

  let teams: Awaited<ReturnType<typeof fetchSavantTeamStatcast>> = [];
  try {
    teams = await fetchSavantTeamStatcast(season);
  } catch (e) {
    errors.push(`fetchSavantTeamStatcast: ${e instanceof Error ? e.message : String(e)}`);
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  if (teams.length === 0) {
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const now = new Date().toISOString();
  const rows = teams.map((t) => ({
    team_code: t.teamCode,
    season,
    xwoba: t.xwoba,
    barrel_pct: t.barrelPct,
    hard_hit_pct: t.hardHitPct,
    launch_angle: t.launchAngle,
    savant_synced_at: now,
  }));

  const { error } = await db
    .from('mlb_team_stats')
    .upsert(rows, { onConflict: DB_CONSTRAINTS.mlbTeamStats });

  if (error) {
    errors.push(`mlb_team_stats upsert (savant): ${error.message}`);
    return { gamesFound: teams.length, rowsInserted: 0, errors };
  }

  return { gamesFound: teams.length, rowsInserted: rows.length, errors };
}

// ─────────────────────────────────────────────
// mlb_predict_final
// ─────────────────────────────────────────────
async function runPredictFinal(db: DB, date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  const errors: string[] = [];
  const season = parseInt(date.slice(0, 4), 10);

  // Load today's MLB games from mlb_schedule
  const { data: games, error: gErr } = await db
    .from('mlb_schedule')
    .select('external_game_id, home_team_code, away_team_code')
    .eq('game_date', date)
    .eq('status', 'scheduled');

  if (gErr) {
    errors.push(`mlb_schedule select: ${gErr.message}`);
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const gameList = (games ?? []) as Array<{ external_game_id: string; home_team_code: string; away_team_code: string }>;
  if (gameList.length === 0) {
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  // mlb_team_stats 실측 조회 (cycle 2057 wiring — mlb_fancy_scrape/mlb_savant_scrape 가 채워둔 값을
  // 이제야 소비. row 부재 팀/컬럼은 MLB_STAT_DEFAULTS fallback — 부분 데이터도 안전.
  const { data: statsRows } = await db
    .from('mlb_team_stats')
    .select('team_code, woba, fip, xfip, war, xwoba, barrel_pct')
    .eq('season', season);

  const statsByTeam = new Map<string, MlbTeamStatsRow>();
  for (const row of (statsRows ?? []) as MlbTeamStatsRow[]) {
    statsByTeam.set(row.team_code, row);
  }

  const predictionRows = gameList.map((g) => {
    const home = statsByTeam.get(g.home_team_code);
    const away = statsByTeam.get(g.away_team_code);
    const homeParkPf = (MLB_TEAMS as Record<string, { parkPf: number }>)[g.home_team_code]?.parkPf;

    const prob = computeMlbProbability({
      sp_fip: { home: home?.fip ?? MLB_STAT_DEFAULTS.fip, away: away?.fip ?? MLB_STAT_DEFAULTS.fip },
      sp_xfip: { home: home?.xfip ?? MLB_STAT_DEFAULTS.xfip, away: away?.xfip ?? MLB_STAT_DEFAULTS.xfip },
      lineup_woba: { home: home?.woba ?? MLB_STAT_DEFAULTS.woba, away: away?.woba ?? MLB_STAT_DEFAULTS.woba },
      bullpen_fip: { home: home?.fip ?? MLB_STAT_DEFAULTS.fip, away: away?.fip ?? MLB_STAT_DEFAULTS.fip },
      recent_form: { home: 50, away: 50 },
      war: { home: home?.war ?? MLB_STAT_DEFAULTS.war, away: away?.war ?? MLB_STAT_DEFAULTS.war },
      head_to_head: { homeWinRate: 0.5 },
      park_factor: homeParkPf != null ? homeParkPf / 100 : 1.0,
      elo: { home: ELO_NEUTRAL, away: ELO_NEUTRAL },
      defense_sfr: { home: 0, away: 0 },
      lineup_xwoba: { home: home?.xwoba ?? MLB_STAT_DEFAULTS.xwoba, away: away?.xwoba ?? MLB_STAT_DEFAULTS.xwoba },
      lineup_barrel_pct: { home: home?.barrel_pct ?? MLB_STAT_DEFAULTS.barrelPct, away: away?.barrel_pct ?? MLB_STAT_DEFAULTS.barrelPct },
      sp_xwoba_against: { home: MLB_STAT_DEFAULTS.xwoba, away: MLB_STAT_DEFAULTS.xwoba },
      woba_std: { home: 0.030, away: 0.030 },
    });
    return {
      league: 'mlb',
      external_game_id: g.external_game_id,
      mlb_game_date: date,
      home_win_prob: prob,
      // predicted_winner = INT REFERENCES teams(id) — KBO 전용. MLB 팀 row 부재 → null.
      // 승자 정보는 home_win_prob + mlb_schedule.home/away_team_code 로 derive.
      predicted_winner: null,
      scoring_rule: MLB_SCORING_RULE,
      // cycle 2065 fix — computeMlbProbability 입력으로만 쓰이고 저장은 안 되던 실측
      // 팩터 값을 breakdown 컬럼에 영속화. buildMlbTeamFactorAverages / computeCompositeDuel
      // MLB 버전(plan #24 Phase 2a/3c)이 이 컬럼을 읽는데 전량 NULL이라 항상 빈 값이었음
      // (사례 21, DB 실측: home_sp_fip 등 non-null count 0/N). team stats row 부재 시
      // MLB_STAT_DEFAULTS 로 대체된 값(가짜)은 저장 X — null 유지해 null-guard 가 유효
      // 팩터 수에서 자연 제외(기존 computeCompositeDuel 설계와 동일 원칙).
      // elo/recent_form/head_to_head/sfr 은 MLB 미구현 placeholder(계산 입력용 중립값)라
      // 계속 미저장 — 실제 데이터 없는 컬럼에 가짜 숫자 심지 않음.
      home_sp_fip: home?.fip ?? null,
      away_sp_fip: away?.fip ?? null,
      home_sp_xfip: home?.xfip ?? null,
      away_sp_xfip: away?.xfip ?? null,
      home_lineup_woba: home?.woba ?? null,
      away_lineup_woba: away?.woba ?? null,
      home_bullpen_fip: home?.fip ?? null,
      away_bullpen_fip: away?.fip ?? null,
      home_war_total: home?.war ?? null,
      away_war_total: away?.war ?? null,
      home_lineup_xwoba: home?.xwoba ?? null,
      away_lineup_xwoba: away?.xwoba ?? null,
      home_lineup_barrel_pct: home?.barrel_pct ?? null,
      away_lineup_barrel_pct: away?.barrel_pct ?? null,
    };
  });

  // delete-then-insert (partial index 대신 idempotent 보장)
  const { error: dErr } = await db
    .from('predictions')
    .delete()
    .eq('league', 'mlb')
    .eq('mlb_game_date', date)
    .eq('scoring_rule', MLB_SCORING_RULE);

  if (dErr) {
    errors.push(`predictions delete: ${dErr.message}`);
    return { gamesFound: gameList.length, rowsInserted: 0, errors };
  }

  const { error: pErr } = await db
    .from('predictions')
    .insert(predictionRows);

  if (pErr) {
    errors.push(`predictions insert: ${pErr.message}`);
    return { gamesFound: gameList.length, rowsInserted: 0, errors };
  }

  return { gamesFound: gameList.length, rowsInserted: predictionRows.length, errors };
}

// ─────────────────────────────────────────────
// mlb_combined_notify — stub (apps/moneyball에서 처리)
// ─────────────────────────────────────────────
async function runCombinedNotify(_db: DB, _date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  // packages/kbo-data 는 apps/moneyball 의 MlbCombinedMessage 를 import 불가.
  // API route /api/mlb/pipeline 의 mlb_combined_notify 분기에서 직접 처리.
  // 여기선 stub — rows_inserted=0, errors=[].
  return { gamesFound: 0, rowsInserted: 0, errors: [] };
}

// ─────────────────────────────────────────────
// mlb_shadow_train
// ─────────────────────────────────────────────
async function runShadowTrain(db: DB, date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  const errors: string[] = [];

  // Load resolved MLB games from mlb_schedule
  const { data: games, error: gErr } = await db
    .from('mlb_schedule')
    .select('external_game_id, home_score, away_score')
    .eq('game_date', date)
    .eq('status', 'final');

  if (gErr) {
    errors.push(`mlb_schedule select: ${gErr.message}`);
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const gameList = (games ?? []) as Array<{ external_game_id: string; home_score: number; away_score: number }>;
  if (gameList.length === 0) {
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  // Load predictions for these games
  const gameIds = gameList.map((g) => g.external_game_id);
  const { data: preds, error: pErr } = await db
    .from('predictions')
    .select('external_game_id, home_win_prob')
    .eq('league', 'mlb')
    .eq('scoring_rule', MLB_SCORING_RULE)
    .in('external_game_id', gameIds);

  if (pErr) {
    errors.push(`predictions select: ${pErr.message}`);
    return { gamesFound: gameList.length, rowsInserted: 0, errors };
  }

  const predMap = new Map(
    ((preds ?? []) as Array<{ external_game_id: string; home_win_prob: number }>).map((p) => [
      p.external_game_id,
      p.home_win_prob,
    ]),
  );

  const samples: TrainingSample[] = gameList
    .filter((g) => predMap.has(g.external_game_id))
    .map((g) => ({
      factors: { home_win_prob: predMap.get(g.external_game_id)! },
      homeWon: g.home_score > g.away_score ? 1 : 0,
    }));

  if (samples.length === 0) {
    return { gamesFound: gameList.length, rowsInserted: 0, errors };
  }

  const trainResult = trainShadowWeights(samples);

  // Check milestone
  const hitMilestone = MILESTONE_TRIGGERS.includes(samples.length as typeof MILESTONE_TRIGGERS[number]);

  // Insert shadow training result
  const { error: sErr } = await db.from('mlb_shadow_train_log').insert({
    date,
    sample_count: samples.length,
    weights: trainResult.weights,
    brier: trainResult.brier,
    accuracy: trainResult.accuracy,
    milestone_hit: hitMilestone,
  });

  if (sErr) {
    errors.push(`shadow_train insert: ${sErr.message}`);
    return { gamesFound: gameList.length, rowsInserted: 0, errors };
  }

  return { gamesFound: gameList.length, rowsInserted: 1, errors };
}

// ─────────────────────────────────────────────
// mlb_walk_forward_measure
// ─────────────────────────────────────────────
async function runWalkForwardMeasure(db: DB, date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  const errors: string[] = [];

  // MLB predictions 는 predictions.mlb_game_date + external_game_id 에 박제 (game_id=NULL).
  // 2-step: predictions select → mlb_schedule select via external_game_id IN.
  // games!inner 조인은 KBO 전용 (game_id FK) — MLB 에 부적합 (silent drift family fix, cycle 1168).
  const { data: preds, error: pErr } = await db
    .from('predictions')
    .select('external_game_id, home_win_prob')
    .eq('league', 'mlb')
    .eq('scoring_rule', MLB_SCORING_RULE)
    .eq('mlb_game_date', date);

  if (pErr) {
    errors.push(`predictions select: ${pErr.message}`);
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const predList = ((preds ?? []) as Array<{ external_game_id: string; home_win_prob: number }>);
  if (predList.length === 0) {
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const externalIds = predList.map((p) => p.external_game_id);
  const { data: schedules, error: sErr } = await db
    .from('mlb_schedule')
    .select('external_game_id, home_score, away_score, status')
    .in('external_game_id', externalIds)
    .eq('status', 'final');

  if (sErr) {
    errors.push(`mlb_schedule select: ${sErr.message}`);
    return { gamesFound: predList.length, rowsInserted: 0, errors };
  }

  const scheduleMap = new Map(
    ((schedules ?? []) as Array<{ external_game_id: string; home_score: number; away_score: number; status: string }>).map((s) => [
      s.external_game_id,
      s,
    ]),
  );

  const finalRows = predList
    .filter((p) => scheduleMap.has(p.external_game_id))
    .map((p) => ({ home_win_prob: p.home_win_prob, game: scheduleMap.get(p.external_game_id)! }));

  if (finalRows.length === 0) {
    return { gamesFound: predList.length, rowsInserted: 0, errors };
  }

  const brierInputs: BrierInput[] = finalRows.map((r) => ({
    predicted: r.home_win_prob,
    actual: r.game.home_score > r.game.away_score ? 1 : 0,
  }));

  const brier = computeBrier(brierInputs);

  const { error: bErr } = await db.from('walk_forward_brier').insert({
    date,
    league: 'mlb',
    scoring_rule: MLB_SCORING_RULE,
    brier_score: brier,
    sample_count: finalRows.length,
  });

  if (bErr) {
    errors.push(`walk_forward_brier insert: ${bErr.message}`);
    return { gamesFound: finalRows.length, rowsInserted: 0, errors };
  }

  return { gamesFound: finalRows.length, rowsInserted: 1, errors };
}

// ─────────────────────────────────────────────
// main orchestrator
// ─────────────────────────────────────────────
export async function runMlbPipeline(
  mode: MlbPipelineMode,
  date: string,
  triggeredBy: string,
): Promise<MlbPipelineResult> {
  if (!MLB_MODES.has(mode)) {
    throw new Error(`unknown mode: ${mode}`);
  }

  const db = createAdminClient();

  let gamesFound = 0;
  let rowsInserted = 0;
  let errors: string[] = [];

  switch (mode) {
    case 'mlb_statsapi_scrape': {
      const r = await runStatsApiScrape(db, date);
      gamesFound = r.gamesFound;
      rowsInserted = r.rowsInserted;
      errors = r.errors;
      break;
    }
    case 'mlb_fancy_scrape': {
      const r = await runFancyScrape(db, date);
      gamesFound = r.gamesFound;
      rowsInserted = r.rowsInserted;
      errors = r.errors;
      break;
    }
    case 'mlb_savant_scrape': {
      const r = await runSavantScrape(db, date);
      gamesFound = r.gamesFound;
      rowsInserted = r.rowsInserted;
      errors = r.errors;
      break;
    }
    case 'mlb_predict_final': {
      const r = await runPredictFinal(db, date);
      gamesFound = r.gamesFound;
      rowsInserted = r.rowsInserted;
      errors = r.errors;
      break;
    }
    case 'mlb_combined_notify': {
      const r = await runCombinedNotify(db, date);
      gamesFound = r.gamesFound;
      rowsInserted = r.rowsInserted;
      errors = r.errors;
      break;
    }
    case 'mlb_shadow_train': {
      const r = await runShadowTrain(db, date);
      gamesFound = r.gamesFound;
      rowsInserted = r.rowsInserted;
      errors = r.errors;
      break;
    }
    case 'mlb_walk_forward_measure': {
      const r = await runWalkForwardMeasure(db, date);
      gamesFound = r.gamesFound;
      rowsInserted = r.rowsInserted;
      errors = r.errors;
      break;
    }
  }

  // pipeline_runs 기록 — MLB 실행 추적
  const hasErrors = errors.length > 0;
  const runStatus = hasErrors && rowsInserted === 0 ? 'error' : 'success';
  await db.from('pipeline_runs').insert({
    run_date: date,
    league: 'mlb',
    mode,
    status: runStatus,
    games_found: gamesFound,
    predictions: rowsInserted,
    errors: hasErrors ? errors : [],
    triggered_by: triggeredBy,
  }).then(({ error: e }) => {
    if (e) console.error(`[MLB] pipeline_runs insert failed: ${e.message}`);
  });

  // Silent drift alert — MLB modes 매핑
  await captureSilentDriftAlert({
    mode,
    date,
    gamesFound,
    predictionsGenerated: rowsInserted,
    errors,
  });

  return {
    mode,
    date,
    games_found: gamesFound,
    rows_inserted: rowsInserted,
    errors,
    triggered_by: triggeredBy,
  };
}
