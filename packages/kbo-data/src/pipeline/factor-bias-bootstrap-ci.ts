/**
 * cycle 59 — prod 30일 sfr/h2h factor bias bootstrap CI 측정
 *
 * cycle 56 spec section 8 step 2 carry-over (cycle 57 backtest CI 후속, cycle 58 op-analysis heavy carry-over).
 * cycle 52 lesson factor_error_summary view 의 sfr -0.233 / h2h -0.161 raw bias 에
 * bootstrap B=1000 95% CI 적용.
 *
 * 검증 분기 (cycle 56 spec section 5 결정 기준 2번):
 *   - 95% CI 가 0 포함 → H1a (sample noise) 후보 강화 → 변경 보류
 *   - 95% CI 가 0 배제 → H1 (systematic) 강화 → v2.1 후보 A/B 적용 검토
 *
 * 실행:
 *   cd apps/moneyball && set -a && source .env.local && set +a && \
 *     tsx ../../packages/kbo-data/src/pipeline/factor-bias-bootstrap-ci.ts
 */

import { createClient } from '@supabase/supabase-js';

const FACTORS_OF_INTEREST = ['sfr', 'head_to_head'] as const;
const DAYS = 30;
const B = 1000;
const ALPHA = 0.05;

interface FactorError {
  factor: string;
  predictedBias: number;
  diagnosis?: string;
}

interface PredictionRow {
  id: string;
  game_id?: string | null;
  reasoning: { factorErrors?: FactorError[] };
}

function bootstrapCI(
  values: number[],
  B: number,
  alpha: number,
): {
  mean: number;
  lower: number;
  upper: number;
  n: number;
  containsZero: boolean;
} {
  const N = values.length;
  if (N === 0) return { mean: 0, lower: 0, upper: 0, n: 0, containsZero: true };

  const observed = values.reduce((s, v) => s + v, 0) / N;
  const means: number[] = [];

  for (let b = 0; b < B; b++) {
    let sum = 0;
    for (let i = 0; i < N; i++) {
      sum += values[Math.floor(Math.random() * N)];
    }
    means.push(sum / N);
  }

  means.sort((a, b) => a - b);
  const lower = means[Math.floor((alpha / 2) * B)];
  const upper = means[Math.ceil((1 - alpha / 2) * B) - 1];
  const containsZero = lower <= 0 && upper >= 0;

  return { mean: observed, lower, upper, n: N, containsZero };
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('env missing — run from apps/moneyball with .env.local sourced');

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('predictions')
    .select('id,game_id,reasoning')
    .eq('prediction_type', 'post_game')
    .gte('created_at', cutoff)
    .limit(2000);

  if (error) throw error;
  if (!data) throw new Error('no data');

  const rows = data as PredictionRow[];
  console.log(`\ncycle 59 — sfr/h2h prod bias bootstrap CI`);
  console.log(`measured_at: ${new Date().toISOString()}`);
  console.log(`window: last ${DAYS} days (cutoff ${cutoff})`);
  console.log(`B=${B} percentile, alpha=${ALPHA}`);
  console.log(`\nTotal post_game rows: ${rows.length}`);

  const buckets: Record<string, number[]> = {};
  for (const factor of FACTORS_OF_INTEREST) buckets[factor] = [];

  let totalErrors = 0;
  for (const row of rows) {
    const errors = row.reasoning?.factorErrors ?? [];
    for (const err of errors) {
      if ((FACTORS_OF_INTEREST as readonly string[]).includes(err.factor)) {
        buckets[err.factor].push(err.predictedBias);
      }
      totalErrors++;
    }
  }
  console.log(`Total factorErrors entries: ${totalErrors}`);

  console.log(`\n=== Bootstrap CI (B=${B}, 95% percentile) ===\n`);
  console.log('factor          | n   | mean   | 95% CI                | verdict');
  console.log('----------------|-----|--------|-----------------------|--------');

  for (const factor of FACTORS_OF_INTEREST) {
    const values = buckets[factor];
    const ci = bootstrapCI(values, B, ALPHA);
    const verdict = ci.containsZero
      ? 'CI 0 포함 → H1a (sample noise)'
      : 'CI 0 배제 → H1 (systematic)';

    console.log(
      `${factor.padEnd(15)} | ${String(ci.n).padStart(3)} | ${ci.mean.toFixed(3).padStart(6)} | [${ci.lower.toFixed(3)}, ${ci.upper.toFixed(3)}]    | ${verdict}`,
    );
  }
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
