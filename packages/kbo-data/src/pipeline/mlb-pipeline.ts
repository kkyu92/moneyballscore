// MLB 파이프라인 오케스트레이터
//
// Plan C Task 2 — MLB 7 mode 실행 + silent drift alert 연동.
// mlb_statsapi_scrape: fetchMlbSchedule → games DB upsert (league='mlb').
// mlb_fancy_scrape / mlb_savant_scrape: stub (스크래퍼 미구현, TODO).
// mlb_predict_final: computeMlbProbability → predictions DB insert.
// mlb_combined_notify: Telegram combined 메시지 (mlb_combined_notify route 통해 발송).
// mlb_shadow_train: trainShadowWeights → milestone check + walk_forward_brier insert.
// mlb_walk_forward_measure: computeBrier → walk_forward_brier insert.
//
// packages/kbo-data 는 apps/moneyball 를 import 못함 → mlb_combined_notify
// stub 처리 (API route 에서 직접 처리).

import { createClient } from '@supabase/supabase-js';
import { fetchMlbSchedule } from '../scrapers/statsapi-mlb';
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
    .upsert(rows, { onConflict: 'external_game_id' });

  if (error) {
    errors.push(`mlb_schedule upsert: ${error.message}`);
    return { gamesFound: games.length, rowsInserted: 0, errors };
  }

  return { gamesFound: games.length, rowsInserted: rows.length, errors };
}

// ─────────────────────────────────────────────
// mlb_predict_final
// ─────────────────────────────────────────────
async function runPredictFinal(db: DB, date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  const errors: string[] = [];

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

  const predictionRows = gameList.map((g) => {
    const prob = computeMlbProbability({
      sp_fip: { home: 4.0, away: 4.0 },
      sp_xfip: { home: 4.0, away: 4.0 },
      lineup_woba: { home: 0.320, away: 0.320 },
      bullpen_fip: { home: 4.0, away: 4.0 },
      recent_form: { home: 50, away: 50 },
      war: { home: 0, away: 0 },
      head_to_head: { homeWinRate: 0.5 },
      park_factor: 1.0,
      elo: { home: 1500, away: 1500 },
      defense_sfr: { home: 0, away: 0 },
      lineup_xwoba: { home: 0.320, away: 0.320 },
      lineup_barrel_pct: { home: 0.08, away: 0.08 },
      sp_xwoba_against: { home: 0.320, away: 0.320 },
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
      scoring_rule: 'mlb_v0.1',
    };
  });

  // delete-then-insert (partial index 대신 idempotent 보장)
  const { error: dErr } = await db
    .from('predictions')
    .delete()
    .eq('league', 'mlb')
    .eq('mlb_game_date', date)
    .eq('scoring_rule', 'mlb_v0.1');

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
    .eq('scoring_rule', 'mlb_v0.1')
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
    .eq('scoring_rule', 'mlb_v0.1')
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
    scoring_rule: 'mlb_v0.1',
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
    case 'mlb_fancy_scrape':
      // stub — FanGraphs MLB scraper 미구현 (TODO)
      gamesFound = 0;
      rowsInserted = 0;
      errors = [];
      break;
    case 'mlb_savant_scrape':
      // stub — Baseball Savant scraper 미구현 (TODO)
      gamesFound = 0;
      rowsInserted = 0;
      errors = [];
      break;
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
