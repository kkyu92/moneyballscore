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

  // Upsert into games table with league='mlb'
  const rows = games.map((g) => ({
    league: 'mlb',
    external_game_id: String(g.gamePk),
    game_date: date,
    game_datetime_utc: g.gameDateUtc.toISOString(),
    home_team: g.homeTeam,
    away_team: g.awayTeam,
    status: g.status,
    home_score: g.homeScore ?? null,
    away_score: g.awayScore ?? null,
  }));

  const { error } = await db
    .from('games')
    .upsert(rows, { onConflict: 'external_game_id' });

  if (error) {
    errors.push(`games upsert: ${error.message}`);
    return { gamesFound: games.length, rowsInserted: 0, errors };
  }

  return { gamesFound: games.length, rowsInserted: rows.length, errors };
}

// ─────────────────────────────────────────────
// mlb_predict_final
// ─────────────────────────────────────────────
async function runPredictFinal(db: DB, date: string): Promise<{ gamesFound: number; rowsInserted: number; errors: string[] }> {
  const errors: string[] = [];

  // Load today's MLB games from DB
  const { data: games, error: gErr } = await db
    .from('games')
    .select('external_game_id, home_team, away_team')
    .eq('league', 'mlb')
    .eq('game_date', date)
    .eq('status', 'scheduled');

  if (gErr) {
    errors.push(`games select: ${gErr.message}`);
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  const gameList = (games ?? []) as Array<{ external_game_id: string; home_team: string; away_team: string }>;
  if (gameList.length === 0) {
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  // Compute probability for each game using default inputs
  // Full factor inputs will be wired when scrapers are complete (stub values for now)
  const predictionRows = gameList.map((g) => {
    // stub factor inputs — 스크래퍼 완성 전 default neutral values
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
      game_date: date,
      external_game_id: g.external_game_id,
      home_team: g.home_team,
      away_team: g.away_team,
      home_win_prob: prob,
      scoring_rule: 'mlb_v0.1',
    };
  });

  const { error: pErr } = await db
    .from('predictions')
    .upsert(predictionRows, { onConflict: 'external_game_id,scoring_rule' });

  if (pErr) {
    errors.push(`predictions upsert: ${pErr.message}`);
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

  // Load resolved MLB games (has result) for training
  const { data: games, error: gErr } = await db
    .from('games')
    .select('external_game_id, home_score, away_score')
    .eq('league', 'mlb')
    .eq('game_date', date)
    .eq('status', 'final');

  if (gErr) {
    errors.push(`games select: ${gErr.message}`);
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

  // Load final games with predictions for Brier score computation
  const { data: joined, error: jErr } = await db
    .from('predictions')
    .select('home_win_prob, games!inner(home_score, away_score, status)')
    .eq('league', 'mlb')
    .eq('scoring_rule', 'mlb_v0.1')
    .eq('game_date', date);

  if (jErr) {
    errors.push(`joined select: ${jErr.message}`);
    return { gamesFound: 0, rowsInserted: 0, errors };
  }

  // Supabase join 결과 — games 관계는 배열로 반환됨. unknown 캐스트 후 처리.
  const rawRows = (joined ?? []) as unknown as Array<{
    home_win_prob: number;
    games: Array<{ home_score: number; away_score: number; status: string }>;
  }>;

  // games 배열에서 첫 번째 row 추출 후 final 필터
  const rows = rawRows
    .map((r) => ({ home_win_prob: r.home_win_prob, game: r.games[0] }))
    .filter((r): r is { home_win_prob: number; game: { home_score: number; away_score: number; status: string } } => !!r.game);

  const finalRows = rows.filter((r) => r.game.status === 'final');
  if (finalRows.length === 0) {
    return { gamesFound: rows.length, rowsInserted: 0, errors };
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

  // Silent drift alert — MLB modes 매핑
  await captureSilentDriftAlert({
    mode,
    date,
    gamesFound,
    // rowsInserted → predictionsGenerated 필드로 전달
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
