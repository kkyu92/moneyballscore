/**
 * v2.0 후보 가중치 backtest harness — plan #14 C1b (cycle 1019).
 * thin wrapper — helper logic 은 packages/kbo-data/src/backtest/backtest-v2-helpers.ts.
 *
 * 실행:
 *   cd apps/moneyball && set -a && source .env.local && set +a && \
 *     tsx ../../scripts/backtest-v2-candidate.ts        # dry-run
 *     tsx ../../scripts/backtest-v2-candidate.ts --write # docs/research/v2.0-backtest-evidence.md write
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  evaluatePair,
  evaluateFancyElo,
  formatBacktestMarkdown,
  type BacktestPredictionRow,
  type TeamEloMap,
} from '@moneyball/kbo-data/src/backtest/backtest-v2-helpers';
import { fetchEloRatings } from '@moneyball/kbo-data/src/scrapers/fancy-stats';

function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('env missing: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchV18Cohort(db: SupabaseClient): Promise<BacktestPredictionRow[]> {
  const result = await db
    .from('predictions')
    .select(
      'game_id, scoring_rule, factors, games!inner(game_date, status, home_team_id, away_team_id, winner_team_id)',
    )
    .eq('scoring_rule', 'v1.8')
    .eq('prediction_type', 'pre_game')
    .order('game_id', { ascending: false });
  if (result.error) throw new Error(`fetch v1.8 cohort: ${result.error.message}`);
  return (result.data ?? []) as unknown as BacktestPredictionRow[];
}

/**
 * team_code → team_id map (Fancy Stats Elo result → DB team_id 매핑).
 */
async function fetchTeamCodeIdMap(db: SupabaseClient): Promise<Map<string, number>> {
  const result = await db.from('teams').select('id, code');
  if (result.error) throw new Error(`fetch teams: ${result.error.message}`);
  const map = new Map<string, number>();
  for (const row of (result.data ?? []) as Array<{ id: number; code: string }>) {
    map.set(row.code, row.id);
  }
  return map;
}

/**
 * Fancy Stats Elo fetch + team_id 매핑 — plan #15 C1d (cycle 1021).
 * fail tolerant — Elo scraper fail 시 빈 map 반환 (evaluateFancyElo 가 null Brier 보고).
 */
async function fetchTeamElos(db: SupabaseClient): Promise<TeamEloMap> {
  const teamMap = await fetchTeamCodeIdMap(db);
  const teamEloMap: TeamEloMap = new Map();
  try {
    const currentSeason = new Date().getFullYear();
    const eloData = await fetchEloRatings(currentSeason);
    for (const row of eloData) {
      const teamId = teamMap.get(row.team);
      if (teamId != null) teamEloMap.set(teamId, row.elo);
    }
  } catch (e) {
    console.warn(`[backtest-v2-candidate] fetchEloRatings 실패 (Elo baseline skip):`, e instanceof Error ? e.message : String(e));
  }
  return teamEloMap;
}

async function main() {
  const writeMode = process.argv.includes('--write');
  console.log(`[backtest-v2-candidate] mode=${writeMode ? 'write' : 'dry-run'}`);

  const db = createAdminClient();
  const cohort = await fetchV18Cohort(db);
  console.log(`[backtest-v2-candidate] fetched n=${cohort.length} predictions (scoring_rule=v1.8)`);

  // plan #15 C1d — Fancy Stats Elo baseline 측정 (cohort_n=0 이슈와 분리 가능, final game outcome 만 필요)
  const teamElos = await fetchTeamElos(db);
  console.log(`[backtest-v2-candidate] team Elo map size=${teamElos.size}`);

  const result = evaluatePair(cohort);
  const eloResult = evaluateFancyElo(cohort, teamElos);
  result.fancy_stats_elo_brier = eloResult.brier;
  result.fancy_stats_elo_note = eloResult.note;
  console.log(`[backtest-v2-candidate] result:`, JSON.stringify(result, null, 2));

  if (writeMode) {
    const docPath = resolve(__dirname, '../docs/research/v2.0-backtest-evidence.md');
    writeFileSync(docPath, formatBacktestMarkdown(result, 1021), 'utf-8');
    console.log(`[backtest-v2-candidate] written: ${docPath}`);
  } else {
    console.log(`[backtest-v2-candidate] dry-run — pass --write to ship doc`);
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[backtest-v2-candidate] fatal:', e);
    process.exit(1);
  });
}
