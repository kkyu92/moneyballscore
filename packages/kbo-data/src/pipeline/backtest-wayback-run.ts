/**
 * Wayback 팀 stats 포함 logistic 재학습.
 *
 * Feature 7개: eloDiff/400 · formDiff · h2hShift · parkShift/10
 *            + wobaDiff*20 · (awayFip-homeFip)/2 · sfrDiff/20
 *
 * Split: Train 2023 (N≈722) / Test 2024 (N≈727)
 * (2022 경기 DB 미적재, 2025 Wayback 스냅샷 없음.)
 *
 * 목적: wOBA/FIP/SFR feature 의 **통계적 유의성 검증** → v1.5 엔진의
 * lineup_woba, bullpen_fip, sfr 가중치 유지/제거 결정 근거.
 *
 * 실행:
 *   cd apps/moneyball && set -a && source .env.local && set +a && \
 *     tsx ../../packages/kbo-data/src/pipeline/backtest-wayback-run.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  loadDecidedGames,
  fetchEloHistory,
  fetchAllSeasonTeamStats,
  buildFeatures,
  computeMetrics,
} from '../backtest';
import {
  trainLogistic,
  predict,
  vectorize,
  vectorizeExtended,
  coefficientStdErrors,
  FEATURE_NAMES,
  FEATURE_NAMES_EXTENDED,
} from '../backtest/logistic';
import type {
  BacktestGame,
  GameFeatures,
  SeasonStatsMap,
} from '../backtest';
import type { FinishedGame } from '../engine/form';
import type { EloHistory } from '../backtest/elo-history';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

function createAdminClient(): DB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('env missing');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function pct(x: number): string {
  return (x * 100).toFixed(2) + '%';
}

function extract(
  games: BacktestGame[],
  eloHistory: EloHistory,
  seasonStatsBySeason: Map<number, SeasonStatsMap>,
): { features: GameFeatures[]; outcomes: number[] } {
  const priorBySeason = new Map<number, FinishedGame[]>();
  const features: GameFeatures[] = [];
  const outcomes: number[] = [];
  for (const g of games) {
    const prior = priorBySeason.get(g.season) ?? [];
    const ss = seasonStatsBySeason.get(g.season);
    const f = buildFeatures(g, prior, eloHistory, ss);
    if (f) {
      features.push(f);
      outcomes.push(g.homeWon ? 1 : 0);
    }
    prior.unshift({
      home_team_id: g.homeTeamId,
      away_team_id: g.awayTeamId,
      winner_team_id: g.homeWon ? g.homeTeamId : g.awayTeamId,
    });
    priorBySeason.set(g.season, prior);
  }
  return { features, outcomes };
}

function reportCoefs(
  name: string,
  weights: number[],
  intercept: number,
  se: number[],
  featureNames: string[],
) {
  console.log(`\n  === ${name} 계수 ===`);
  console.log('    feature              coef       SE      z        95%CI              유의?');
  for (let j = 0; j < weights.length; j++) {
    const w = weights[j];
    const s = se[j];
    const z = w / s;
    const lo = w - 1.96 * s;
    const hi = w + 1.96 * s;
    const sig =
      Math.abs(z) >= 2.58
        ? '⭐⭐ p<0.01'
        : Math.abs(z) >= 1.96
          ? '⭐ p<0.05'
          : Math.abs(z) >= 1.0
            ? '-'
            : '✗ null-like';
    console.log(
      `    ${featureNames[j].padEnd(20)}  ${w.toFixed(4).padStart(8)}  ${s.toFixed(4)}  ${z.toFixed(2).padStart(6)}  [${lo.toFixed(3).padStart(7)}, ${hi.toFixed(3).padStart(7)}]  ${sig}`,
    );
  }
  console.log(`    intercept            ${intercept.toFixed(4).padStart(8)}`);
}

async function main() {
  console.log('\n=== Wayback 팀 stats + Logistic (Train 2023 / Test 2024) ===\n');

  console.log('[1/4] Elo history + Wayback 시즌 말 stats 다운로드…');
  const eloHistory = await fetchEloHistory();
  const seasonStats = await fetchAllSeasonTeamStats([2023, 2024]);
  for (const [s, m] of seasonStats) {
    console.log(`  season ${s}: ${m.size} teams`);
  }

  console.log('\n[2/4] games 로드…');
  const db = createAdminClient();
  const allGames = await loadDecidedGames(db, { seasons: [2023, 2024] });
  const trainGames = allGames.filter((g) => g.season === 2023);
  const testGames = allGames.filter((g) => g.season === 2024);
  console.log(`  train (2023) N=${trainGames.length}, test (2024) N=${testGames.length}`);

  const train = extract(trainGames, eloHistory, seasonStats);
  const test = extract(testGames, eloHistory, seasonStats);

  console.log('\n[3/4] Logistic 학습 (base 4 feature vs extended 7 feature)…');
  const Xtr4 = train.features.map(vectorize);
  const Xte4 = test.features.map(vectorize);
  const Xtr7 = train.features.map(vectorizeExtended);
  const Xte7 = test.features.map(vectorizeExtended);

  // H6 fix (cycle 23): best-of-lambda by test Brier = test-set hyperparam tuning (double-dip).
  // cycle 22 bootstrap-ci 검증 best λ=0.01 (4f/7f) — fix LAMBDA=0.01.
  const LAMBDA = 0.01;
  interface Fit {
    lambda: number;
    model: ReturnType<typeof trainLogistic>;
  }
  const fit = (X: number[][], y: number[]): Fit => ({
    lambda: LAMBDA,
    model: trainLogistic(X, y, { lambda: LAMBDA, lr: 0.3, maxIter: 8000, tol: 1e-10 }),
  });
  const fit4 = fit(Xtr4, train.outcomes);
  const fit7 = fit(Xtr7, train.outcomes);

  console.log(`  base 4-feature: λ=${fit4.lambda}  iter=${fit4.model.iterations}`);
  console.log(`  extended 7-feature: λ=${fit7.lambda}  iter=${fit7.model.iterations}`);

  const se4 = coefficientStdErrors(fit4.model, Xtr4);
  const se7 = coefficientStdErrors(fit7.model, Xtr7);
  reportCoefs('Base (4 feature)', fit4.model.weights, fit4.model.intercept, se4, FEATURE_NAMES);
  reportCoefs(
    'Extended (7 feature — Wayback wOBA/FIP/SFR 추가)',
    fit7.model.weights,
    fit7.model.intercept,
    se7,
    FEATURE_NAMES_EXTENDED,
  );

  console.log('\n[4/4] Out-of-Sample Test (2024) Metrics…\n');
  const tr4Pred = predict(fit4.model, Xtr4);
  const te4Pred = predict(fit4.model, Xte4);
  const tr7Pred = predict(fit7.model, Xtr7);
  const te7Pred = predict(fit7.model, Xte7);
  const base05Te = new Array(test.outcomes.length).fill(0.5);
  const base05Tr = new Array(train.outcomes.length).fill(0.5);

  const trM4 = computeMetrics(tr4Pred, train.outcomes);
  const teM4 = computeMetrics(te4Pred, test.outcomes);
  const trM7 = computeMetrics(tr7Pred, train.outcomes);
  const teM7 = computeMetrics(te7Pred, test.outcomes);
  const trCoin = computeMetrics(base05Tr, train.outcomes);
  const teCoin = computeMetrics(base05Te, test.outcomes);

  function line(name: string, m: { brier: number; logLoss: number; accuracy: number; n: number }) {
    console.log(
      `  ${name.padEnd(26)} Brier ${m.brier.toFixed(5)}  LogLoss ${m.logLoss.toFixed(5)}  Acc ${pct(m.accuracy)}  n=${m.n}`,
    );
  }
  console.log('  --- Train (2023) ---');
  line('coin_flip(0.5)', trCoin);
  line('Logistic 4-feature', trM4);
  line('Logistic 7-feature', trM7);

  console.log('\n  --- Test (2024) — out-of-sample ---');
  line('coin_flip(0.5)', teCoin);
  line('Logistic 4-feature', teM4);
  line('Logistic 7-feature', teM7);

  const dBrier = teM7.brier - teM4.brier;
  console.log(
    `\n  ΔBrier (7-feature vs 4-feature, test): ${dBrier >= 0 ? '+' : ''}${dBrier.toFixed(5)}`,
  );
  if (dBrier < -0.001) {
    console.log('  → Wayback feature 추가가 test Brier 개선.');
  } else if (dBrier > 0.001) {
    console.log('  → Wayback feature 추가가 test Brier 악화 (overfitting 또는 noise).');
  } else {
    console.log('  → Brier 차이 미미 (|Δ| < 0.001).');
  }

  // Test calibration 7-feature
  console.log('\n  --- Test Calibration (7-feature) ---');
  console.log('    [prob range]   n    avgP      actualHomeWin');
  for (const b of teM7.calibration) {
    if (b.n === 0) continue;
    console.log(
      `    [${b.lo.toFixed(1)}, ${b.hi.toFixed(1)})  ${String(b.n).padStart(4)}  ${b.avgPredicted.toFixed(3)}  ${b.actualRate.toFixed(3)}`,
    );
  }

  console.log('\n=== 완료 ===\n');
}

main().catch((err) => {
  console.error('WAYBACK LOGISTIC FAILED:', err);
  process.exit(1);
});
