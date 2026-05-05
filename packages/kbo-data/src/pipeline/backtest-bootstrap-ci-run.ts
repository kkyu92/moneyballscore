/**
 * H1 검증 — Bootstrap CI 로 backtest ΔBrier 95% CI 측정.
 *
 * Cycle 21 결과 박제:
 *   - backtest ΔBrier (Manual v1.5 - v1.6) = +0.00056
 *   - prod    ΔBrier (Manual v1.5 - v1.6) = +0.04160 (38pp accuracy 격차 환산)
 *   → 78× + 정반대 방향. cycle 21 spec 의 H1 (sample noise) 이 가장 강한 후보.
 *
 * 본 스크립트 = test set 2024 N=727 에 B=1000 bootstrap resample 적용.
 * 각 resample 마다 4 method (manual_v15, manual_v16, logistic_4f, logistic_7f) Brier 재계산.
 * Δ(v15-v16), Δ(v15-log7) 의 percentile-based 95% CI 도출.
 *
 * 검증 분기:
 *   - 95% CI 가 prod ΔBrier (+0.0416) 포함 → H1 강한 시그널 (sample noise 로 설명 가능)
 *   - 95% CI 가 +0.0416 배제 → H1 약함 (sample noise 외 다른 원인 = H2 look-ahead / H3 distribution)
 *
 * 한계: backtest test N=727, prod N=46 (cycle 17 박제) — variance 가 prod 가 훨씬 큼.
 * 따라서 backtest CI 는 lower bound 역할. backtest CI 가 +0.0416 포함 X 시
 * = prod variance 까지 합쳐도 sample noise 로 설명 어려움 (필요조건 검증).
 *
 * 실행:
 *   cd apps/moneyball && set -a && source .env.local && set +a && \
 *     tsx ../../packages/kbo-data/src/pipeline/backtest-bootstrap-ci-run.ts
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

function normalize(homeVal: number, awayVal: number, higherIsBetter: boolean): number {
  if (homeVal === 0 && awayVal === 0) return 0.5;
  const total = Math.abs(homeVal) + Math.abs(awayVal);
  if (total === 0) return 0.5;
  if (higherIsBetter) return homeVal / total;
  return awayVal / total;
}

function computeFactors(f: GameFeatures): Record<string, number> {
  const factors: Record<string, number> = {};
  factors.sp_fip = normalize(f.homeFip ?? 4.5, f.awayFip ?? 4.5, false);
  factors.sp_xfip = 0.5;
  factors.lineup_woba = normalize(f.homeWoba ?? 0, f.awayWoba ?? 0, true);
  factors.bullpen_fip = 0.5;
  factors.recent_form = normalize(f.homeForm ?? 0.5, f.awayForm ?? 0.5, true);
  factors.war = 0.5;
  const h2hTotal = f.h2hHomeWins + f.h2hAwayWins;
  factors.head_to_head = h2hTotal > 0 ? f.h2hHomeWins / h2hTotal : 0.5;
  const pf = f.parkPf;
  let park = pf > 1 ? 0.5 + (pf - 1) * 2 : 0.5 - (1 - pf) * 2;
  if (pf > 10) {
    park = pf > 100 ? 0.5 + (pf - 100) / 100 * 2 : 0.5 - (100 - pf) / 100 * 2;
  }
  factors.park_factor = Math.max(0.3, Math.min(0.7, park));
  factors.elo = normalize(f.homeElo, f.awayElo, true);
  factors.sfr = normalize(f.homeSfr ?? 0, f.awaySfr ?? 0, true);
  return factors;
}

function manualScore(f: GameFeatures, weights: Record<string, number>): number {
  const factors = computeFactors(f);
  const weightSum = Object.values(weights).reduce<number>((a, b) => a + b, 0);
  let weightedSum = 0;
  for (const [key, w] of Object.entries(weights)) {
    weightedSum += (factors[key] ?? 0.5) * w;
  }
  const prob = weightedSum / weightSum + HOME_ADVANTAGE;
  return Math.max(0.15, Math.min(0.85, prob));
}

const WEIGHTS_V15: Record<string, number> = { ...DEFAULT_WEIGHTS };
const WEIGHTS_V16: Record<string, number> = {
  ...DEFAULT_WEIGHTS,
  head_to_head: 0,
  park_factor: 0,
  sfr: 0,
};
const WEIGHTS_V21A: Record<string, number> = {
  sp_fip: 0.15, sp_xfip: 0.05, lineup_woba: 0.18, bullpen_fip: 0.10,
  recent_form: 0.13, war: 0.08, head_to_head: 0.02, park_factor: 0.04,
  elo: 0.08, sfr: 0.02,
};
const WEIGHTS_V21B: Record<string, number> = {
  sp_fip: 0.16, sp_xfip: 0.05, lineup_woba: 0.17, bullpen_fip: 0.11,
  recent_form: 0.12, war: 0.09, head_to_head: 0.02, park_factor: 0.04,
  elo: 0.09, sfr: 0.00,
};
const WEIGHTS_V21C: Record<string, number> = {
  sp_fip: 0.18, sp_xfip: 0.06, lineup_woba: 0.18, bullpen_fip: 0.11,
  recent_form: 0.12, war: 0.10, head_to_head: 0.00, park_factor: 0.00,
  elo: 0.10, sfr: 0.00,
};

/** Mulberry32 — fast deterministic PRNG (seedable). */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Brier score on subset (indices). */
function brierOn(predictions: number[], outcomes: number[], indices: Int32Array): number {
  let sum = 0;
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i]!;
    const d = predictions[idx]! - outcomes[idx]!;
    sum += d * d;
  }
  return sum / indices.length;
}

/** Percentile from sorted array (linear interp). */
function percentile(sorted: number[], p: number): number {
  const n = sorted.length;
  const idx = (n - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

async function main() {
  console.log('\n=== H1 검증 — Bootstrap CI (B=1000) ===\n');

  console.log('[1/5] Elo history + Wayback 시즌 말 stats…');
  const eloHistory = await fetchEloHistory();
  const seasonStats = await fetchAllSeasonTeamStats([2023, 2024]);

  console.log('\n[2/5] games 로드…');
  const db = createAdminClient();
  const allGames = await loadDecidedGames(db, { seasons: [2023, 2024] });
  const trainGames = allGames.filter((g) => g.season === 2023);
  const testGames = allGames.filter((g) => g.season === 2024);
  console.log(`  train (2023) N=${trainGames.length}, test (2024) N=${testGames.length}`);

  const train = extract(trainGames, eloHistory, seasonStats);
  const test = extract(testGames, eloHistory, seasonStats);

  console.log('\n[3/5] 7 method 예측 (Test 2024)…');
  const v15Pred = test.features.map((f) => manualScore(f, WEIGHTS_V15));
  const v16Pred = test.features.map((f) => manualScore(f, WEIGHTS_V16));
  const v21APred = test.features.map((f) => manualScore(f, WEIGHTS_V21A));
  const v21BPred = test.features.map((f) => manualScore(f, WEIGHTS_V21B));
  const v21CPred = test.features.map((f) => manualScore(f, WEIGHTS_V21C));

  const Xtr4 = train.features.map(vectorize);
  const Xte4 = test.features.map(vectorize);
  const Xtr7 = train.features.map(vectorizeExtended);
  const Xte7 = test.features.map(vectorizeExtended);
  // H6 fix (cycle 23): best-of-lambda by test Brier = double-dip. cycle 22 검증 best λ=0.01 → fix.
  const LAMBDA = 0.01;
  const fit = (X: number[][], y: number[]) =>
    trainLogistic(X, y, { lambda: LAMBDA, lr: 0.3, maxIter: 8000, tol: 1e-10 });
  const log4Pred = logisticPredict(fit(Xtr4, train.outcomes), Xte4);
  const log7Pred = logisticPredict(fit(Xtr7, train.outcomes), Xte7);

  const N = test.outcomes.length;
  console.log(`\n[4/5] Bootstrap B=1000, N=${N}…`);

  const B = 1000;
  const SEED = 42;
  const rng = mulberry32(SEED);

  const v15Briers: number[] = new Array(B);
  const v16Briers: number[] = new Array(B);
  const v21ABriers: number[] = new Array(B);
  const v21BBriers: number[] = new Array(B);
  const v21CBriers: number[] = new Array(B);
  const log4Briers: number[] = new Array(B);
  const log7Briers: number[] = new Array(B);
  const dV15V16: number[] = new Array(B);
  const dV15Log7: number[] = new Array(B);
  const dV15V21A: number[] = new Array(B);
  const dV15V21B: number[] = new Array(B);
  const dV15V21C: number[] = new Array(B);

  for (let b = 0; b < B; b++) {
    const idx = new Int32Array(N);
    for (let i = 0; i < N; i++) idx[i] = Math.floor(rng() * N);
    v15Briers[b] = brierOn(v15Pred, test.outcomes, idx);
    v16Briers[b] = brierOn(v16Pred, test.outcomes, idx);
    v21ABriers[b] = brierOn(v21APred, test.outcomes, idx);
    v21BBriers[b] = brierOn(v21BPred, test.outcomes, idx);
    v21CBriers[b] = brierOn(v21CPred, test.outcomes, idx);
    log4Briers[b] = brierOn(log4Pred, test.outcomes, idx);
    log7Briers[b] = brierOn(log7Pred, test.outcomes, idx);
    dV15V16[b] = v15Briers[b]! - v16Briers[b]!;
    dV15Log7[b] = v15Briers[b]! - log7Briers[b]!;
    dV15V21A[b] = v15Briers[b]! - v21ABriers[b]!;
    dV15V21B[b] = v15Briers[b]! - v21BBriers[b]!;
    dV15V21C[b] = v15Briers[b]! - v21CBriers[b]!;
  }

  const point = {
    v15: computeMetrics(v15Pred, test.outcomes).brier,
    v16: computeMetrics(v16Pred, test.outcomes).brier,
    v21A: computeMetrics(v21APred, test.outcomes).brier,
    v21B: computeMetrics(v21BPred, test.outcomes).brier,
    v21C: computeMetrics(v21CPred, test.outcomes).brier,
    log4: computeMetrics(log4Pred, test.outcomes).brier,
    log7: computeMetrics(log7Pred, test.outcomes).brier,
  };

  function ci(arr: number[]) {
    const sorted = [...arr].sort((a, b) => a - b);
    return {
      lo: percentile(sorted, 0.025),
      hi: percentile(sorted, 0.975),
      mean: arr.reduce((a, b) => a + b, 0) / arr.length,
    };
  }
  const ciV15 = ci(v15Briers);
  const ciV16 = ci(v16Briers);
  const ciV21A = ci(v21ABriers);
  const ciV21B = ci(v21BBriers);
  const ciV21C = ci(v21CBriers);
  const ciLog4 = ci(log4Briers);
  const ciLog7 = ci(log7Briers);
  const ciD1 = ci(dV15V16);
  const ciD2 = ci(dV15Log7);
  const ciD21A = ci(dV15V21A);
  const ciD21B = ci(dV15V21B);
  const ciD21C = ci(dV15V21C);

  console.log('\n[5/5] 결과…\n');
  function row(name: string, p: number, c: { lo: number; hi: number; mean: number }) {
    console.log(
      `  ${name.padEnd(24)} point ${p.toFixed(5)}  95%CI [${c.lo.toFixed(5)}, ${c.hi.toFixed(5)}]  width ${(c.hi - c.lo).toFixed(5)}`,
    );
  }
  console.log('  Brier 95% CI per method:');
  row('Manual v1.5', point.v15, ciV15);
  row('Manual v1.6', point.v16, ciV16);
  row('Manual v2.1-A', point.v21A, ciV21A);
  row('Manual v2.1-B', point.v21B, ciV21B);
  row('Manual v2.1-C', point.v21C, ciV21C);
  row('Logistic 4-feat', point.log4, ciLog4);
  row('Logistic 7-feat', point.log7, ciLog7);

  console.log('\n  ΔBrier 95% CI (v15 - X — 양수 = X 우수):');
  const dPoint1 = point.v15 - point.v16;
  const dPoint2 = point.v15 - point.log7;
  const dPointA = point.v15 - point.v21A;
  const dPointB = point.v15 - point.v21B;
  const dPointC = point.v15 - point.v21C;
  function dRow(name: string, dp: number, c: { lo: number; hi: number; mean: number }) {
    const sigZero = (c.lo > 0 || c.hi < 0) ? '  ★0배제' : '  (0포함)';
    console.log(
      `  ${name.padEnd(22)} point ${dp >= 0 ? '+' : ''}${dp.toFixed(5)}  95%CI [${c.lo >= 0 ? '+' : ''}${c.lo.toFixed(5)}, ${c.hi >= 0 ? '+' : ''}${c.hi.toFixed(5)}]${sigZero}`,
    );
  }
  dRow('v15 - v16', dPoint1, ciD1);
  dRow('v15 - v2.1-A', dPointA, ciD21A);
  dRow('v15 - v2.1-B', dPointB, ciD21B);
  dRow('v15 - v2.1-C', dPointC, ciD21C);
  dRow('v15 - log7', dPoint2, ciD2);

  console.log('\n=== H1 결론 ===\n');
  const PROD_DELTA = 0.0416;
  console.log(`  prod ΔBrier (v15-v16) = +${PROD_DELTA.toFixed(5)} (cycle 17 박제, 38pp acc 격차 환산)`);
  console.log(`  backtest ΔBrier (v15-v16) 95%CI = [${ciD1.lo.toFixed(5)}, ${ciD1.hi.toFixed(5)}]`);

  const ciContainsProd = PROD_DELTA >= ciD1.lo && PROD_DELTA <= ciD1.hi;
  console.log('');
  if (ciContainsProd) {
    console.log('  → prod ΔBrier 가 backtest 95% CI 안에 포함됨.');
    console.log('    H1 강한 시그널 — prod 격차 38pp 가 sample noise 로 설명 가능.');
    console.log('    cycle 17 회귀 결정 정당성 = sample noise 인식 후 보수적 회귀.');
  } else if (PROD_DELTA > ciD1.hi) {
    const excessRatio = PROD_DELTA / ciD1.hi;
    console.log(`  → prod ΔBrier 가 backtest 95% CI 상한 ${excessRatio.toFixed(1)}× 초과.`);
    console.log('    H1 약함 — sample noise 만으론 prod 격차 설명 어려움.');
    console.log('    H2 (look-ahead bias) / H3 (distribution shift) / 다른 원인 의심.');
    console.log('    단 prod N=46 variance 미반영 — pure prod 만 bootstrap 시 더 넓을 가능성.');
  } else {
    console.log('  → prod ΔBrier 가 backtest 95% CI 하한 미만 (정반대 방향, 불가능 영역).');
    console.log('    H1 약함 — prod 격차 부호 자체가 backtest variance 와 mismatch.');
  }

  console.log('\n  지표 메타:');
  console.log(`    backtest CI width (v15-v16) = ${(ciD1.hi - ciD1.lo).toFixed(5)}`);
  console.log(`    backtest CI mean (v15-v16)  = ${ciD1.mean >= 0 ? '+' : ''}${ciD1.mean.toFixed(5)}`);
  console.log(`    prod / backtest mean ratio  = ${(PROD_DELTA / Math.max(Math.abs(ciD1.mean), 1e-6)).toFixed(1)}× ${ciD1.mean < 0 ? '(부호 반대)' : '(부호 동일)'}`);

  console.log('\n=== 완료 ===\n');
}

main().catch((err) => {
  console.error('BOOTSTRAP CI BACKTEST FAILED:', err);
  process.exit(1);
});
