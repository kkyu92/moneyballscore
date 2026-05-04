/**
 * Logistic regression 학습 + 2023-24 train / 2025 test 백테스트.
 *
 * 실행:
 *   cd apps/moneyball && set -a && source .env.local && set +a && \
 *     tsx ../../packages/kbo-data/src/pipeline/backtest-logistic-run.ts
 *
 * 출력:
 *   - 학습된 계수 + SE + 95% CI + 유의성 마크
 *   - Train (2023-24) / Test (2025) Brier/LogLoss/Accuracy
 *   - 단순 baseline 대비 Δ
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  loadDecidedGames,
  fetchEloHistory,
  buildFeatures,
  computeMetrics,
  modelCoinFlip,
  modelEloHomeAdv,
  makeRestricted,
  DEFAULT_RESTRICTED,
} from '../backtest';
import {
  trainLogistic,
  predict,
  vectorize,
  coefficientStdErrors,
  FEATURE_NAMES,
} from '../backtest/logistic';
import type { BacktestGame, GameFeatures } from '../backtest/types';
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

/**
 * 각 경기에 대해 feature 를 시점별로 재구성해 X, y 와 features 배열 리턴.
 * priorBySeason 는 시즌 내 누적 final 경기 (desc 정렬).
 */
function extractFeatures(
  games: BacktestGame[],
  eloHistory: EloHistory,
): { X: number[][]; y: number[]; features: GameFeatures[]; games: BacktestGame[] } {
  const priorBySeason = new Map<number, FinishedGame[]>();
  const X: number[][] = [];
  const y: number[] = [];
  const features: GameFeatures[] = [];
  const used: BacktestGame[] = [];

  for (const g of games) {
    const prior = priorBySeason.get(g.season) ?? [];
    const f = buildFeatures(g, prior, eloHistory);
    if (f) {
      X.push(vectorize(f));
      y.push(g.homeWon ? 1 : 0);
      features.push(f);
      used.push(g);
    }
    prior.unshift({
      home_team_id: g.homeTeamId,
      away_team_id: g.awayTeamId,
      winner_team_id: g.homeWon ? g.homeTeamId : g.awayTeamId,
    });
    priorBySeason.set(g.season, prior);
  }
  return { X, y, features, games: used };
}

async function main() {
  console.log('\n=== Logistic Regression 백테스트 ===\n');

  console.log('[1/3] Elo history + games 로드…');
  const eloHistory = await fetchEloHistory();
  const db = createAdminClient();
  const allGames = await loadDecidedGames(db, { seasons: [2023, 2024, 2025] });
  console.log(`  games ${allGames.length}`);

  // Train = 2023+2024, Test = 2025
  const trainGames = allGames.filter((g) => g.season <= 2024);
  const testGames = allGames.filter((g) => g.season === 2025);

  const train = extractFeatures(trainGames, eloHistory);
  const test = extractFeatures(testGames, eloHistory);
  console.log(`  train N=${train.X.length} (2023-24) / test N=${test.X.length} (2025)`);

  // H6 fix (cycle 23): grid search by test Brier = test-set hyperparam tuning (double-dip).
  // cycle 22 bootstrap-ci 검증 best λ=0.01 (4f/7f) — fix LAMBDA=0.01.
  const LAMBDA = 0.01;
  console.log('\n[2/3] Logistic regression 학습 (λ=0.01 fixed)…');
  const model = trainLogistic(train.X, train.y, {
    lambda: LAMBDA,
    lr: 0.3,
    maxIter: 10000,
    tol: 1e-10,
  });
  {
    const trainPreds = predict(model, train.X);
    const trainM = computeMetrics(trainPreds, train.y);
    const testPreds = predict(model, test.X);
    const testM = computeMetrics(testPreds, test.y);
    console.log(
      `  λ=${String(LAMBDA).padStart(5)}  iter=${String(model.iterations).padStart(5)}  trainBrier=${trainM.brier.toFixed(5)}  testBrier=${testM.brier.toFixed(5)}  testAcc=${pct(testM.accuracy)}`,
    );
  }

  // 최종 모델 상세 보고
  console.log('\n[3/3] 최종 모델 계수 + 평가…\n');
  const se = coefficientStdErrors(model, train.X);

  console.log('  === 학습된 계수 (train = 2023-24 N=' + train.X.length + ') ===');
  console.log('    feature              coef       SE      z        95%CI              유의?');
  for (let j = 0; j < model.weights.length; j++) {
    const w = model.weights[j];
    const s = se[j];
    const z = w / s;
    const lo = w - 1.96 * s;
    const hi = w + 1.96 * s;
    const sig = Math.abs(z) >= 1.96 ? '⭐ p<0.05' : Math.abs(z) >= 1.0 ? '-' : '✗ null-like';
    console.log(
      `    ${FEATURE_NAMES[j].padEnd(18)}  ${w.toFixed(4).padStart(8)}  ${s.toFixed(4)}  ${z.toFixed(2).padStart(6)}  [${lo.toFixed(4)}, ${hi.toFixed(4)}]  ${sig}`,
    );
  }
  console.log(`    intercept            ${model.intercept.toFixed(4).padStart(8)}  (홈 advantage bias)`);

  // 평가 — train / test 양쪽 + 비교 모델들
  const trainPreds = predict(model, train.X);
  const testPreds = predict(model, test.X);
  const trainM = computeMetrics(trainPreds, train.y);
  const testM = computeMetrics(testPreds, test.y);

  console.log('\n  === Train (2023-24) Metrics ===');
  console.log(`    Logistic        Brier ${trainM.brier.toFixed(5)}  LogLoss ${trainM.logLoss.toFixed(5)}  Acc ${pct(trainM.accuracy)}`);
  const trainBaselineProbs = new Array(train.X.length).fill(0.5);
  const trainBaseM = computeMetrics(trainBaselineProbs, train.y);
  console.log(`    coin_flip(0.5)  Brier ${trainBaseM.brier.toFixed(5)}  LogLoss ${trainBaseM.logLoss.toFixed(5)}  Acc ${pct(trainBaseM.accuracy)}`);

  console.log('\n  === Test (2025) Metrics — out-of-sample ===');
  const testBaseline05 = new Array(test.X.length).fill(0.5);
  const testBase05M = computeMetrics(testBaseline05, test.y);
  const testEloOnly = test.features.map((f) => modelEloHomeAdv(f));
  const testEloM = computeMetrics(testEloOnly, test.y);
  const testRestr = test.features.map((f) => makeRestricted(DEFAULT_RESTRICTED)(f));
  const testRestrM = computeMetrics(testRestr, test.y);

  console.log(`    coin_flip(0.5)         Brier ${testBase05M.brier.toFixed(5)}  LogLoss ${testBase05M.logLoss.toFixed(5)}  Acc ${pct(testBase05M.accuracy)}`);
  console.log(`    B. elo_only            Brier ${testEloM.brier.toFixed(5)}  LogLoss ${testEloM.logLoss.toFixed(5)}  Acc ${pct(testEloM.accuracy)}`);
  console.log(`    C. restricted_baseline Brier ${testRestrM.brier.toFixed(5)}  LogLoss ${testRestrM.logLoss.toFixed(5)}  Acc ${pct(testRestrM.accuracy)}`);
  console.log(`    H. logistic (λ=${LAMBDA})   Brier ${testM.brier.toFixed(5)}  LogLoss ${testM.logLoss.toFixed(5)}  Acc ${pct(testM.accuracy)}`);

  const dBrier = testM.brier - testBase05M.brier;
  console.log(`\n    ΔBrier (H - coin_flip) = ${dBrier >= 0 ? '+' : ''}${dBrier.toFixed(5)}`);
  if (dBrier < 0) console.log('    → H 모델이 coin_flip 보다 Brier 개선.');
  else console.log('    → H 모델도 coin_flip 보다 Brier 악화. Feature 조합이 prediction 에 유의미 신호 없음.');

  // Calibration on test
  console.log('\n  === Test Calibration (H 모델) ===');
  console.log('    [prob range]   n    avgP      actualHomeWin');
  for (const b of testM.calibration) {
    if (b.n === 0) continue;
    console.log(
      `    [${b.lo.toFixed(1)}, ${b.hi.toFixed(1)})  ${String(b.n).padStart(5)}  ${b.avgPredicted.toFixed(3)}  ${b.actualRate.toFixed(3)}`,
    );
  }

  console.log('\n=== 완료 ===\n');
}

main().catch((err) => {
  console.error('LOGISTIC BACKTEST FAILED:', err);
  process.exit(1);
});
