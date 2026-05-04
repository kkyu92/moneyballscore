/**
 * H4 검증 — Manual gradient (가중합) vs Logistic 학습 모델 비교.
 *
 * Wayback backtest 가 logistic regression 으로 v1.6 (h2h/park/sfr 0%) 도출.
 * Prod 는 DEFAULT_WEIGHTS 가중합 (predictor.ts) 사용. **두 모델 구조 다름**:
 *  - logistic = feature 간 상호작용 학습 (additive 아님)
 *  - manual   = factor × weight 가산합 (단순 add)
 *
 * 본 스크립트 = wayback test set (2024) 에 manual scoring 직접 적용해서
 * v1.5 / v1.6 / logistic 4-feature / logistic 7-feature 4 모델 Brier 비교.
 *
 * 결과 분기:
 *  - manual v1.5 > logistic    → H4 확정 (구조 mismatch). prod 격차 일부 설명.
 *  - manual v1.5 ≈ logistic    → H4 약화. H2/H3 (look-ahead, distribution) 노란 깃발.
 *  - manual v1.5 < manual v1.6 → Wayback 결론 (h2h/park/sfr 제거) backtest 안에서도 재현.
 *  - manual v1.5 > manual v1.6 → Wayback 결론 backtest 안에서도 안 재현 (prod 격차 핵심).
 *
 * 한계: GameFeatures 에 sp_xfip / bullpen_fip / war 없음 → manual 매핑 시 0.5 (중립).
 * v1.5 의 매핑 가능 weight = 0.62 (sp_fip + lineup_woba + recent_form + h2h + park + elo + sfr),
 * 매핑 불가 = 0.23 (sp_xfip + bullpen_fip + war). prod 와 100% 동일 모델 X — H4 의
 * 핵심 질문 (가산 모델 vs logistic) 자체는 답할 수 있음.
 *
 * 실행:
 *   cd apps/moneyball && set -a && source .env.local && set +a && \
 *     tsx ../../packages/kbo-data/src/pipeline/backtest-manual-weights-run.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_WEIGHTS, HOME_ADVANTAGE } from '@moneyball/shared';
import {
  loadDecidedGames,
  fetchEloHistory,
  fetchAllSeasonTeamStats,
  buildFeatures,
  computeMetrics,
} from '../backtest';
import {
  trainLogistic,
  predict as logisticPredict,
  vectorize,
  vectorizeExtended,
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

/**
 * predictor.ts 의 normalize() 와 동일 — 두 값을 0~1 범위로 정규화.
 * higherIsBetter=true: home 큰 값일수록 1 / false: home 작은 값일수록 1.
 */
function normalize(homeVal: number, awayVal: number, higherIsBetter: boolean): number {
  if (homeVal === 0 && awayVal === 0) return 0.5;
  const total = Math.abs(homeVal) + Math.abs(awayVal);
  if (total === 0) return 0.5;
  if (higherIsBetter) return homeVal / total;
  return awayVal / total;
}

/**
 * GameFeatures → 10 factor [0,1] 매핑. predictor.ts 와 동일 logic.
 * Wayback backtest 에 sp_xfip / bullpen_fip / war 없음 → 0.5 (중립).
 */
function computeFactors(f: GameFeatures): Record<string, number> {
  const factors: Record<string, number> = {};

  // 1. sp_fip — Wayback team FIP (있으면). 없으면 4.50 default.
  const homeFip = f.homeFip ?? 4.5;
  const awayFip = f.awayFip ?? 4.5;
  factors.sp_fip = normalize(homeFip, awayFip, false);

  // 2. sp_xfip — backtest 미존재. 중립.
  factors.sp_xfip = 0.5;

  // 3. lineup_woba
  factors.lineup_woba = normalize(f.homeWoba ?? 0, f.awayWoba ?? 0, true);

  // 4. bullpen_fip — backtest 미존재. 중립.
  factors.bullpen_fip = 0.5;

  // 5. recent_form
  const hForm = f.homeForm ?? 0.5;
  const aForm = f.awayForm ?? 0.5;
  factors.recent_form = normalize(hForm, aForm, true);

  // 6. war — backtest 미존재. 중립.
  factors.war = 0.5;

  // 7. head_to_head — predictor.ts 와 동일.
  const h2hTotal = f.h2hHomeWins + f.h2hAwayWins;
  factors.head_to_head = h2hTotal > 0 ? f.h2hHomeWins / h2hTotal : 0.5;

  // 8. park_factor — predictor.ts 동일 logic.
  const pf = f.parkPf;
  let park = pf > 1 ? 0.5 + (pf - 1) * 2 : 0.5 - (1 - pf) * 2;
  // parkPf 는 보통 92~108 범위 (parkPf/100). buildFeatures 가 normalize 안 했을 수 있어 분기 처리:
  if (pf > 10) {
    // parkPf 가 100 base scale 인 경우 — predictor.ts 는 1.0 base 받지만 wayback 은 100 base.
    park = pf > 100 ? 0.5 + (pf - 100) / 100 * 2 : 0.5 - (100 - pf) / 100 * 2;
  }
  factors.park_factor = Math.max(0.3, Math.min(0.7, park));

  // 9. elo
  factors.elo = normalize(f.homeElo, f.awayElo, true);

  // 10. sfr
  factors.sfr = normalize(f.homeSfr ?? 0, f.awaySfr ?? 0, true);

  return factors;
}

/**
 * Manual scoring (predictor.ts 와 동일 formula).
 * weighted_sum = Σ factor × weight
 * prob = weighted_sum / FACTOR_TOTAL + HOME_ADV, clamp [0.15, 0.85].
 */
function manualScore(
  f: GameFeatures,
  weights: Record<string, number>,
): number {
  const factors = computeFactors(f);
  const weightSum = Object.values(weights).reduce<number>((a, b) => a + b, 0);
  let weightedSum = 0;
  for (const [key, w] of Object.entries(weights)) {
    weightedSum += (factors[key] ?? 0.5) * w;
  }
  let prob = weightedSum / weightSum + HOME_ADVANTAGE;
  return Math.max(0.15, Math.min(0.85, prob));
}

/** v1.5 = 현재 prod DEFAULT_WEIGHTS (cycle 17 회귀 후 박제). */
const WEIGHTS_V15: Record<string, number> = { ...DEFAULT_WEIGHTS };

/** v1.6 = h2h/park/sfr → 0 (Wayback 백테스트 학습 결과). */
const WEIGHTS_V16: Record<string, number> = {
  ...DEFAULT_WEIGHTS,
  head_to_head: 0,
  park_factor: 0,
  sfr: 0,
};

async function main() {
  console.log('\n=== H4 검증 — Manual 가중합 vs Logistic 학습 (Test 2024) ===\n');

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

  console.log('\n[3/4] Manual 가중합 적용 (Test 2024)…');
  const manualV15Pred = test.features.map((f) => manualScore(f, WEIGHTS_V15));
  const manualV16Pred = test.features.map((f) => manualScore(f, WEIGHTS_V16));

  console.log('\n[4/4] Logistic 학습 (대조군)…');
  const Xtr4 = train.features.map(vectorize);
  const Xte4 = test.features.map(vectorize);
  const Xtr7 = train.features.map(vectorizeExtended);
  const Xte7 = test.features.map(vectorizeExtended);

  // H6 fix (cycle 23): best-of-lambda by test Brier = test-set hyperparam tuning (double-dip).
  // cycle 22 bootstrap-ci 검증 결과 4f/7f 모두 best λ=0.01 → fix LAMBDA=0.01 (결과 변경 없음).
  const LAMBDA = 0.01;
  const fit = (X: number[][], y: number[]) =>
    trainLogistic(X, y, { lambda: LAMBDA, lr: 0.3, maxIter: 8000, tol: 1e-10 });
  const log4Pred = logisticPredict(fit(Xtr4, train.outcomes), Xte4);
  const log7Pred = logisticPredict(fit(Xtr7, train.outcomes), Xte7);
  console.log(`  4-feature: λ=${LAMBDA}, 7-feature: λ=${LAMBDA}`);

  console.log('\n=== 결과 비교 (Test 2024 N=' + test.outcomes.length + ') ===\n');
  const coinPred = new Array(test.outcomes.length).fill(0.5);
  const coinM = computeMetrics(coinPred, test.outcomes);
  const v15M = computeMetrics(manualV15Pred, test.outcomes);
  const v16M = computeMetrics(manualV16Pred, test.outcomes);
  const log4M = computeMetrics(log4Pred, test.outcomes);
  const log7M = computeMetrics(log7Pred, test.outcomes);

  function line(name: string, m: { brier: number; logLoss: number; accuracy: number }) {
    console.log(
      `  ${name.padEnd(28)} Brier ${m.brier.toFixed(5)}  LogLoss ${m.logLoss.toFixed(5)}  Acc ${pct(m.accuracy)}`,
    );
  }
  line('coin_flip(0.5)', coinM);
  line('Manual v1.5 (h2h/park/sfr ON)', v15M);
  line('Manual v1.6 (h2h/park/sfr OFF)', v16M);
  line('Logistic 4-feature', log4M);
  line('Logistic 7-feature', log7M);

  console.log('\n=== H4 결론 ===\n');
  const dManual = v15M.brier - v16M.brier;
  const dV15vsLog7 = v15M.brier - log7M.brier;

  console.log(`  Manual v1.5 - v1.6 ΔBrier: ${dManual >= 0 ? '+' : ''}${dManual.toFixed(5)}`);
  if (dManual < -0.001) {
    console.log('  → v1.5 (h2h/park/sfr ON) 가 v1.6 보다 backtest 안에서도 우수.');
    console.log('    Wayback logistic 결론 (3 feature 0%) 가 manual 가산모델에선 재현 안됨.');
    console.log('    H4 강한 시그널 — 모델 구조 mismatch.');
  } else if (dManual > 0.001) {
    console.log('  → v1.5 가 v1.6 보다 backtest 안에서 열등 — Wayback 결론 backtest 재현.');
    console.log('    Prod 격차 38pp 의 원인 = backtest 외 (H2 look-ahead / H3 distribution / sample noise).');
  } else {
    console.log('  → v1.5 ≈ v1.6 backtest 안 차이 미미 (|Δ| < 0.001) — H4 약함.');
  }

  console.log(`\n  Manual v1.5 - Logistic 7f ΔBrier: ${dV15vsLog7 >= 0 ? '+' : ''}${dV15vsLog7.toFixed(5)}`);
  if (dV15vsLog7 < -0.001) {
    console.log('  → Manual 가산모델이 Logistic 학습 모델보다 우수.');
    console.log('    H4 확정 — 모델 구조 자체가 prod 적용에 적합. Wayback 학습 결과는 prod 에 직접 적용 부적합.');
  } else if (dV15vsLog7 > 0.001) {
    console.log('  → Logistic 학습 모델이 Manual 가산보다 우수.');
    console.log('    H4 약화 — 모델 구조보단 다른 원인 (H2/H3) 의심.');
  } else {
    console.log('  → 모델 구조별 차이 미미 — H4 약함.');
  }

  console.log('\n  매핑 가능 weight 합: 0.62 (sp_fip+lineup_woba+recent_form+h2h+park+elo+sfr)');
  console.log('  매핑 불가 weight 합: 0.23 (sp_xfip+bullpen_fip+war = 0.5 중립)');
  console.log('  본 manual 모델 ≠ prod 100% 동일 — H4 의 핵심 질문만 답.');

  console.log('\n=== 완료 ===\n');
}

main().catch((err) => {
  console.error('MANUAL WEIGHTS BACKTEST FAILED:', err);
  process.exit(1);
});
