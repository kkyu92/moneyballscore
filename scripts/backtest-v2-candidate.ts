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
  formatBacktestMarkdown,
  type BacktestPredictionRow,
} from '@moneyball/kbo-data/src/backtest/backtest-v2-helpers';

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
      'game_id, scoring_rule, factors, games!inner(game_date, status, home_team_id, winner_team_id)',
    )
    .eq('scoring_rule', 'v1.8')
    .eq('prediction_type', 'pre_game')
    .order('game_id', { ascending: false });
  if (result.error) throw new Error(`fetch v1.8 cohort: ${result.error.message}`);
  return (result.data ?? []) as unknown as BacktestPredictionRow[];
}

async function main() {
  const writeMode = process.argv.includes('--write');
  console.log(`[backtest-v2-candidate] mode=${writeMode ? 'write' : 'dry-run'}`);

  const db = createAdminClient();
  const cohort = await fetchV18Cohort(db);
  console.log(`[backtest-v2-candidate] fetched n=${cohort.length} predictions (scoring_rule=v1.8)`);

  const result = evaluatePair(cohort);
  console.log(`[backtest-v2-candidate] result:`, JSON.stringify(result, null, 2));

  if (writeMode) {
    const docPath = resolve(__dirname, '../docs/research/v2.0-backtest-evidence.md');
    writeFileSync(docPath, formatBacktestMarkdown(result, 1019), 'utf-8');
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
