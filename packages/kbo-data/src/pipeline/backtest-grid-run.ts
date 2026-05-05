/**
 * Restricted 모델 grid search — 2023-24 train 에서 최적 파라미터 찾고 2025 test 평가.
 *
 * 파라미터:
 *   kElo   Elo 차에 곱할 스케일 (1.0 = 원본). logistic 결과에서 ≈0.5 예상.
 *   kForm  form diff → Elo pt 환산 계수.
 *   kH2h   h2h shift → Elo pt 환산 계수.
 *   kPark  park factor → Elo pt 환산 계수 (null-like 검증용).
 *   homeAdvElo  홈 advantage intercept.
 *
 * 실행:
 *   cd apps/moneyball && set -a && source .env.local && set +a && \
 *     tsx ../../packages/kbo-data/src/pipeline/backtest-grid-run.ts
 *
 * 결과:
 *   - train Brier 기준 top-5 조합
 *   - 각 top 조합의 test Brier + LogLoss + Acc
 *   - park=0 만 바꾼 조합 별도 비교
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  loadDecidedGames,
  fetchEloHistory,
  buildFeatures,
  makeRestricted,
  modelCoinFlip,
  computeMetrics,
  DEFAULT_RESTRICTED,
  HOME_ADV_ELO_DEFAULT,
} from '../backtest';
import type {
  BacktestGame,
  GameFeatures,
  RestrictedParams,
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

/** priorBySeason 상태를 시간순 유지하며 feature 추출. */
function extractFeatures(
  games: BacktestGame[],
  eloHistory: EloHistory,
): { features: GameFeatures[]; outcomes: number[] } {
  const priorBySeason = new Map<number, FinishedGame[]>();
  const features: GameFeatures[] = [];
  const outcomes: number[] = [];
  for (const g of games) {
    const prior = priorBySeason.get(g.season) ?? [];
    const f = buildFeatures(g, prior, eloHistory);
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

function brier(
  features: GameFeatures[],
  outcomes: number[],
  params: RestrictedParams,
): number {
  const model = makeRestricted(params);
  let sum = 0;
  for (let i = 0; i < features.length; i++) {
    const p = model(features[i]);
    sum += (p - outcomes[i]) ** 2;
  }
  return sum / features.length;
}

async function main() {
  console.log('\n=== Grid Search: Restricted 파라미터 최적화 ===\n');

  console.log('[1/3] 데이터 로드…');
  const eloHistory = await fetchEloHistory();
  const db = createAdminClient();
  const allGames = await loadDecidedGames(db, { seasons: [2023, 2024, 2025] });
  const train = extractFeatures(
    allGames.filter((g) => g.season <= 2024),
    eloHistory,
  );
  const test = extractFeatures(
    allGames.filter((g) => g.season === 2025),
    eloHistory,
  );
  console.log(`  train N=${train.features.length} / test N=${test.features.length}`);

  // 2. Grid 정의
  const grid = {
    kElo: [0.3, 0.5, 0.7, 1.0, 1.3],
    kForm: [0, 20, 40, 60],
    kH2h: [0, 20, 40],
    kPark: [0, 2, 5],
    homeAdvElo: [5, 10, 15, 20],
    // h2hMinN — 최소 표본수 (cycle 67 spec carry-over 후보 D, cycle 69 review-code heavy)
    // 2 = 기존 동작 / 3, 5 = 노이즈 완화 후보
    h2hMinN: [2, 3, 5],
    // clamp 는 고정 (prod v1.5 와 동일)
  } as const;

  let total = 1;
  total *= grid.kElo.length;
  total *= grid.kForm.length;
  total *= grid.kH2h.length;
  total *= grid.kPark.length;
  total *= grid.homeAdvElo.length;
  total *= grid.h2hMinN.length;
  console.log(`\n[2/3] Grid search (combos=${total})…`);

  interface Eval {
    params: RestrictedParams;
    trainBrier: number;
    testBrier: number;
  }
  const evals: Eval[] = [];
  const t0 = Date.now();
  for (const kElo of grid.kElo) {
    for (const kForm of grid.kForm) {
      for (const kH2h of grid.kH2h) {
        for (const kPark of grid.kPark) {
          for (const homeAdvElo of grid.homeAdvElo) {
            for (const h2hMinN of grid.h2hMinN) {
              const params: RestrictedParams = {
                kElo,
                kForm,
                kH2h,
                kPark,
                homeAdvElo,
                h2hMinN,
                clampLo: DEFAULT_RESTRICTED.clampLo,
                clampHi: DEFAULT_RESTRICTED.clampHi,
              };
              const trainB = brier(train.features, train.outcomes, params);
              const testB = brier(test.features, test.outcomes, params);
              evals.push({ params, trainBrier: trainB, testBrier: testB });
            }
          }
        }
      }
    }
  }
  console.log(`  ↳ ${Date.now() - t0}ms`);

  // 3. 결과 출력
  evals.sort((a, b) => a.trainBrier - b.trainBrier);
  console.log('\n[3/3] Train Brier 기준 top-10 (+ test Brier):\n');
  console.log('    # kElo kForm kH2h kPark homeAdv h2hMinN  trainBrier  testBrier');
  console.log('    ──────────────────────────────────────────────────────────────────');
  for (let i = 0; i < Math.min(10, evals.length); i++) {
    const e = evals[i];
    const p = e.params;
    console.log(
      `   ${String(i + 1).padStart(2)}  ${p.kElo.toFixed(1)}  ${String(p.kForm).padStart(4)}  ${String(p.kH2h).padStart(3)}  ${String(p.kPark).padStart(4)}  ${String(p.homeAdvElo).padStart(6)}  ${String(p.h2hMinN).padStart(6)}   ${e.trainBrier.toFixed(5)}  ${e.testBrier.toFixed(5)}`,
    );
  }

  const bestTrain = evals[0];
  const defaultParams: RestrictedParams = {
    ...DEFAULT_RESTRICTED,
    homeAdvElo: HOME_ADV_ELO_DEFAULT,
  };
  const defaultTrainB = brier(train.features, train.outcomes, defaultParams);
  const defaultTestB = brier(test.features, test.outcomes, defaultParams);

  // 기준 비교
  console.log('\n  === 기준 모델 Brier (test=2025) ===');
  const coinflipProbs = test.features.map(() => modelCoinFlip({} as GameFeatures));
  const coinflipB = computeMetrics(coinflipProbs, test.outcomes).brier;
  console.log(`    coin_flip                  ${coinflipB.toFixed(5)}`);
  console.log(`    DEFAULT_RESTRICTED          ${defaultTestB.toFixed(5)}  (kElo=1.0, kH2h=30, kPark=2, HA=${HOME_ADV_ELO_DEFAULT.toFixed(1)}, h2hMinN=${DEFAULT_RESTRICTED.h2hMinN})`);

  const best = bestTrain;
  console.log(`    best-by-train (row 1)       ${best.testBrier.toFixed(5)}  ΔvsDEF ${(best.testBrier - defaultTestB).toFixed(5)}`);

  // park=0 효과 isolated: best params 에서 kPark 만 0 vs 원본
  const bestParams = best.params;
  if (bestParams.kPark !== 0) {
    const parkOff = { ...bestParams, kPark: 0 };
    const parkOffB = brier(test.features, test.outcomes, parkOff);
    console.log(
      `    best w/ kPark=0             ${parkOffB.toFixed(5)}  Δ ${(parkOffB - best.testBrier).toFixed(5)} (park 효과)`,
    );
  }

  // DEFAULT_RESTRICTED 에서 kPark 만 0
  const defNoPark = { ...defaultParams, kPark: 0 };
  const defNoParkB = brier(test.features, test.outcomes, defNoPark);
  console.log(
    `    DEFAULT w/ kPark=0          ${defNoParkB.toFixed(5)}  Δ ${(defNoParkB - defaultTestB).toFixed(5)} (park 효과)`,
  );

  // 최종 Top 1 에 대한 전체 메트릭 (Brier/LogLoss/Acc/Calib)
  const bestModel = makeRestricted(best.params);
  const testProbs = test.features.map(bestModel);
  const testM = computeMetrics(testProbs, test.outcomes);
  console.log('\n  === Best combo on 2025 test ===');
  console.log(`    params      kElo=${best.params.kElo}  kForm=${best.params.kForm}  kH2h=${best.params.kH2h}  kPark=${best.params.kPark}  homeAdv=${best.params.homeAdvElo}  h2hMinN=${best.params.h2hMinN}`);
  console.log(`    Brier       ${testM.brier.toFixed(5)}`);
  console.log(`    LogLoss     ${testM.logLoss.toFixed(5)}`);
  console.log(`    Accuracy    ${pct(testM.accuracy)}`);
  console.log('    Calibration:');
  for (const b of testM.calibration) {
    if (b.n === 0) continue;
    console.log(
      `      [${b.lo.toFixed(1)}, ${b.hi.toFixed(1)})  ${String(b.n).padStart(4)}  avgP ${b.avgPredicted.toFixed(3)}  actual ${b.actualRate.toFixed(3)}`,
    );
  }

  // Test Brier 순위도 별도 확인 (overfitting 체크)
  const byTest = [...evals].sort((a, b) => a.testBrier - b.testBrier);
  console.log('\n  === Test Brier 기준 top-5 (overfitting 체크) ===');
  for (let i = 0; i < Math.min(5, byTest.length); i++) {
    const e = byTest[i];
    const p = e.params;
    const rankInTrain = evals.findIndex((x) => x === e) + 1;
    console.log(
      `   ${String(i + 1).padStart(2)}  kElo=${p.kElo}  kForm=${p.kForm}  kH2h=${p.kH2h}  kPark=${p.kPark}  HA=${p.homeAdvElo}  h2hMinN=${p.h2hMinN}  trainRank=${rankInTrain}  testBrier=${e.testBrier.toFixed(5)}`,
    );
  }

  console.log('\n=== 완료 ===\n');
}

main().catch((err) => {
  console.error('GRID FAILED:', err);
  process.exit(1);
});
