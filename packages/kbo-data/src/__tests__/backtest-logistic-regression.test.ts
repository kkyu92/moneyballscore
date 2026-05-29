/**
 * logistic-regression.ts unit test — plan #16 (cycle 1021 carry-over).
 *
 * deterministic fixed-seed fixture — vitest 안 reproducible.
 * fixture 패턴: factor 값 패턴 안 homeWin label 일관 favor signal 박제,
 * learned weights 가 그 signal factor 의 weight > neutral factor 가 되는지 검증.
 */

import { describe, it, expect } from 'vitest';
import { ACTIVE_FACTOR_KEYS } from '@moneyball/shared';
import {
  fitWeightedLogistic,
  normalizeWeights,
  vectorizeFactors,
  type FactorMap,
  type LearnedWeights,
} from '../backtest/logistic-regression';

/**
 * deterministic seed RNG (Mulberry32). 외부 lib 없이 reproducible random.
 */
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 20+ row fixture 생성. signal factor (elo) 가 0.7 면 homeWin=true / 0.3 면 false.
 * neutral factor (head_to_head) 는 random — learned weight 가 작아야 정상.
 */
function makeSignalFixture(n: number, seed: number = 42): {
  factorsList: FactorMap[];
  homeWinList: boolean[];
} {
  const rng = mulberry32(seed);
  const factorsList: FactorMap[] = [];
  const homeWinList: boolean[] = [];

  for (let i = 0; i < n; i++) {
    const isHomeFavored = i % 2 === 0;
    const elo = isHomeFavored ? 0.7 : 0.3;
    const lineupWoba = isHomeFavored ? 0.65 : 0.35;
    // neutral factors: random [0.4, 0.6]
    const noise = () => 0.4 + rng() * 0.2;
    const factors: FactorMap = {
      sp_fip: noise(),
      sp_xfip: noise(),
      lineup_woba: lineupWoba,
      bullpen_fip: noise(),
      recent_form: noise(),
      war: noise(),
      head_to_head: noise(),
      park_factor: noise(),
      elo,
      sfr: noise(),
    };
    factorsList.push(factors);
    // homeWin = signal factor 일관 (noise 0)
    homeWinList.push(isHomeFavored);
  }

  return { factorsList, homeWinList };
}

describe('vectorizeFactors', () => {
  it('FactorMap[] → matrix (ACTIVE_FACTOR_KEYS 순서, mean-center 0.5)', () => {
    const factors: FactorMap[] = [
      { sp_fip: 0.7, lineup_woba: 0.3, elo: 0.5 },
    ];
    const X = vectorizeFactors(factors);
    expect(X.length).toBe(1);
    expect(X[0].length).toBe(ACTIVE_FACTOR_KEYS.length);
    // ACTIVE_FACTOR_KEYS 첫 번째 = 'sp_fip'
    expect(X[0][0]).toBeCloseTo(0.7 - 0.5, 6);
    // 'lineup_woba' = 인덱스 2
    expect(X[0][2]).toBeCloseTo(0.3 - 0.5, 6);
    // 누락 factor (war 등) → neutral 0.5 - 0.5 = 0
    const warIdx = ACTIVE_FACTOR_KEYS.indexOf('war');
    expect(X[0][warIdx]).toBeCloseTo(0, 6);
  });

  it('custom neutral fallback', () => {
    const factors: FactorMap[] = [{ sp_fip: 0.7 }];
    const X = vectorizeFactors(factors, 0.3);
    expect(X[0][0]).toBeCloseTo(0.7 - 0.3, 6);
    const warIdx = ACTIVE_FACTOR_KEYS.indexOf('war');
    expect(X[0][warIdx]).toBeCloseTo(0, 6); // 0.3 - 0.3
  });
});

describe('normalizeWeights', () => {
  it('positive raw weights → sum=1 normalize', () => {
    const raw: LearnedWeights = {
      sp_fip: 1,
      sp_xfip: 1,
      lineup_woba: 1,
      bullpen_fip: 1,
      recent_form: 1,
      war: 1,
      head_to_head: 1,
      park_factor: 1,
      elo: 1,
      sfr: 1,
    };
    const normalized = normalizeWeights(raw);
    const sum = Object.values(normalized).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 3);
    // uniform 0.1
    for (const key of ACTIVE_FACTOR_KEYS) {
      expect(normalized[key]).toBeCloseTo(0.1, 3);
    }
  });

  it('음수 raw weight → 0 clamp (DEFAULT_WEIGHTS invariant 정합)', () => {
    const raw: LearnedWeights = {
      sp_fip: 2,
      sp_xfip: -1,
      lineup_woba: 2,
      bullpen_fip: 1,
      recent_form: 1,
      war: 1,
      head_to_head: 1,
      park_factor: 1,
      elo: 2,
      sfr: 1,
    };
    const normalized = normalizeWeights(raw);
    expect(normalized.sp_xfip).toBe(0);
    const sum = Object.values(normalized).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 3);
  });

  it('clamp [-2, 2] 적용', () => {
    const raw: LearnedWeights = {
      sp_fip: 100, // outlier
      sp_xfip: 1,
      lineup_woba: 1,
      bullpen_fip: 1,
      recent_form: 1,
      war: 1,
      head_to_head: 1,
      park_factor: 1,
      elo: 1,
      sfr: 1,
    };
    const normalized = normalizeWeights(raw, 2);
    // sp_fip clamp = 2 → contribution = 2/11 ≈ 0.1818
    expect(normalized.sp_fip).toBeCloseTo(2 / 11, 2);
  });

  it('모든 raw weight ≤ 0 → uniform fallback', () => {
    const raw: LearnedWeights = {
      sp_fip: -1,
      sp_xfip: -1,
      lineup_woba: -1,
      bullpen_fip: -1,
      recent_form: -1,
      war: -1,
      head_to_head: -1,
      park_factor: -1,
      elo: -1,
      sfr: -1,
    };
    const normalized = normalizeWeights(raw);
    for (const key of ACTIVE_FACTOR_KEYS) {
      expect(normalized[key]).toBeCloseTo(1 / ACTIVE_FACTOR_KEYS.length, 6);
    }
  });
});

describe('fitWeightedLogistic', () => {
  it('빈 dataset → throw', () => {
    expect(() => fitWeightedLogistic([], [])).toThrow('empty dataset');
  });

  it('mismatched length → throw', () => {
    expect(() =>
      fitWeightedLogistic([{ elo: 0.5 }], [true, false]),
    ).toThrow('length');
  });

  it('signal factor (elo/lineup_woba) weight > neutral factor weight', () => {
    const { factorsList, homeWinList } = makeSignalFixture(40, 42);
    const fit = fitWeightedLogistic(factorsList, homeWinList);

    expect(fit.trainN).toBe(40);
    expect(fit.iterations).toBeGreaterThan(0);
    expect(fit.iterations).toBeLessThan(5000); // converged
    expect(fit.finalLoss).toBeLessThan(0.7); // LogLoss < random (0.693)

    // signal factor 가 neutral factor 보다 weight 가 커야 함
    expect(fit.weights.elo).toBeGreaterThan(fit.weights.head_to_head);
    expect(fit.weights.lineup_woba).toBeGreaterThan(fit.weights.head_to_head);

    // sum=1 invariant
    const sum = Object.values(fit.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 3);
  });

  it('deterministic — 동일 fixture → 동일 weights', () => {
    const fixture1 = makeSignalFixture(30, 123);
    const fixture2 = makeSignalFixture(30, 123);
    const fit1 = fitWeightedLogistic(fixture1.factorsList, fixture1.homeWinList);
    const fit2 = fitWeightedLogistic(fixture2.factorsList, fixture2.homeWinList);

    for (const key of ACTIVE_FACTOR_KEYS) {
      expect(fit1.weights[key]).toBeCloseTo(fit2.weights[key], 6);
    }
    expect(fit1.bias).toBeCloseTo(fit2.bias, 6);
    expect(fit1.iterations).toBe(fit2.iterations);
  });

  it('all homeWin=true (degenerate) → bias 학습 + sum=1 invariant 유지', () => {
    const factorsList: FactorMap[] = Array.from({ length: 20 }, () => ({
      sp_fip: 0.5,
      lineup_woba: 0.5,
      elo: 0.5,
    }));
    const homeWinList = factorsList.map(() => true);
    const fit = fitWeightedLogistic(factorsList, homeWinList);

    // bias 가 positive 방향 학습 (모든 outcome = homeWin)
    expect(fit.bias).toBeGreaterThan(0);
    // sum=1 invariant (모든 raw weight ≈ 0 → uniform fallback)
    const sum = Object.values(fit.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 3);
  });

  it('missing factors → NEUTRAL fallback 적용 (학습 가능)', () => {
    const factorsList: FactorMap[] = [
      { elo: 0.7 },
      { elo: 0.3 },
      { elo: 0.7 },
      { elo: 0.3 },
      { elo: 0.7 },
      { elo: 0.3 },
      { elo: 0.7 },
      { elo: 0.3 },
      { elo: 0.7 },
      { elo: 0.3 },
      { elo: 0.7 },
      { elo: 0.3 },
      { elo: 0.7 },
      { elo: 0.3 },
      { elo: 0.7 },
      { elo: 0.3 },
      { elo: 0.7 },
      { elo: 0.3 },
      { elo: 0.7 },
      { elo: 0.3 },
    ];
    const homeWinList = factorsList.map((f) => (f.elo ?? 0) > 0.5);
    const fit = fitWeightedLogistic(factorsList, homeWinList);

    expect(fit.trainN).toBe(20);
    // elo weight > 0 (signal 학습됨)
    expect(fit.weights.elo).toBeGreaterThan(0);
    // 다른 factor 들 = NEUTRAL fallback (raw weight ≈ 0)
    // sum=1 invariant
    const sum = Object.values(fit.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 3);
  });
});
