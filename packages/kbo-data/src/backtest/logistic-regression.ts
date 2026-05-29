/**
 * Train weights 학습 layer — plan #16 (cycle 1021 carry-over).
 *
 * pure function only (sentry/supabase free) — vitest deterministic.
 *
 * 의도: plan #15 autoplan Eng-C1 finding (CRITICAL) + 사용자 결정 (B rename, PR #1376)
 * 후속. v18-only-rescore mode = train set 폐기 (split.test only). 본 module = 진짜
 * train cohort 위 weights 학습 layer.
 *
 * 입력 형식: `predictions.factors` JSON (예: `{ sp_fip: 0.62, lineup_woba: 0.55, ... }`).
 * 각 factor 값은 대략 [0, 1] 범위 (predictor.ts 안 정규화). NEUTRAL=0.5.
 *
 * 알고리즘:
 * - logistic.ts (v3 GameFeatures vector) 와 분리 — 본 module 은 factor map 만.
 * - batch gradient descent + L2 regularization (logistic.ts 패턴 정합).
 * - learned raw weights → clamp [-2, 2] → sum-1 normalize (DEFAULT_WEIGHTS invariant 정합).
 *
 * 자가 의심 (plan #16 frontmatter 정합):
 * - 소표본 (train cohort n ≈ 105 추정) noise — learned weights 절대값 신뢰 X
 * - cross-version factor normalization 위장 risk — v1.5/v1.6/v1.7-revert factors 가 다른
 *   weights/scale 로 generate 됐을 가능성
 * - 본 module 결과 = "evidence pack only" 라벨 강제
 */

import { ACTIVE_FACTOR_KEYS } from '@moneyball/shared';

export type FactorKey = (typeof ACTIVE_FACTOR_KEYS)[number];
export type FactorMap = Partial<Record<FactorKey, number>>;
export type LearnedWeights = Record<FactorKey, number>;

export interface FitOptions {
  /** L2 regularization 계수 (default 0.01) */
  lambda?: number;
  /** learning rate (default 0.5) */
  lr?: number;
  /** 최대 반복 횟수 (default 5000) */
  maxIter?: number;
  /** loss 변화량 수렴 임계 (default 1e-8) */
  tol?: number;
  /** raw weight clamp 범위 (default ±2) */
  clamp?: number;
  /** factor 누락 시 NEUTRAL fallback (default 0.5) */
  neutral?: number;
}

export interface FitResult {
  /** sum=1 으로 normalize 된 learned weights (DEFAULT_WEIGHTS 형식 정합) */
  weights: LearnedWeights;
  /** raw learned weights (clamp 전 GD 결과) — debug 용 */
  rawWeights: LearnedWeights;
  /** intercept (bias) — sigmoid(z + bias) */
  bias: number;
  /** 수렴까지 반복 횟수 */
  iterations: number;
  /** 최종 loss 값 (LogLoss + L2 penalty) */
  finalLoss: number;
  /** 학습에 사용된 sample 수 (factors 모두 null/missing 인 row 제외) */
  trainN: number;
}

function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

function dot(x: number[], w: number[]): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * w[i];
  return s;
}

/**
 * FactorMap[] → matrix X (rows × ACTIVE_FACTOR_KEYS 순서, NEUTRAL fallback).
 * factor 값은 [0, 1] 범위 가정 — center 0.5 빼서 [-0.5, 0.5] 로 mean-center
 * (수렴 안정성 + intercept 의미 보존).
 */
export function vectorizeFactors(
  factorsList: FactorMap[],
  neutral: number = 0.5,
): number[][] {
  return factorsList.map((f) =>
    ACTIVE_FACTOR_KEYS.map((key) => {
      const v = f[key];
      const raw = typeof v === 'number' && Number.isFinite(v) ? v : neutral;
      return raw - neutral; // mean-center
    }),
  );
}

/**
 * clamp + sum-1 normalize. 음수 weight 는 0 으로 clamp (DEFAULT_WEIGHTS invariant 정합,
 * 모든 production weight ≥ 0).
 *
 * 자가 의심: 음수 raw weight 가 valid signal 일 수 있으나 production engine 은
 * 음수 weight 미지원 (predictor.ts 의 weightedSum 공식 정합). 본 normalize 는
 * production-compatible weights 추출 목적.
 */
export function normalizeWeights(
  rawWeights: LearnedWeights,
  clamp: number = 2,
): LearnedWeights {
  const clamped: Record<FactorKey, number> = {} as Record<FactorKey, number>;
  let total = 0;
  for (const key of ACTIVE_FACTOR_KEYS) {
    const raw = rawWeights[key];
    // clamp [-clamp, +clamp] → positive part 만 사용 (음수는 0)
    const bounded = Math.max(-clamp, Math.min(clamp, raw));
    const positive = Math.max(0, bounded);
    clamped[key] = positive;
    total += positive;
  }
  if (total === 0) {
    // 모든 raw weight 가 음수 또는 0 — fallback uniform
    const uniform = 1 / ACTIVE_FACTOR_KEYS.length;
    const result: Record<FactorKey, number> = {} as Record<FactorKey, number>;
    for (const key of ACTIVE_FACTOR_KEYS) result[key] = uniform;
    return result;
  }
  const normalized: Record<FactorKey, number> = {} as Record<FactorKey, number>;
  for (const key of ACTIVE_FACTOR_KEYS) {
    normalized[key] = Math.round((clamped[key] / total) * 10000) / 10000;
  }
  return normalized;
}

/**
 * train cohort 위 logistic regression fit. batch GD + L2.
 *
 * input:
 *   factorsList = predictions.factors JSON 의 배열 (각 row 의 factor map)
 *   homeWinList = 각 row 의 outcome (homeWin = true → 1)
 *
 * output:
 *   weights = sum=1 으로 normalize 된 learned weights (DEFAULT_WEIGHTS 형식)
 *   rawWeights = clamp 전 GD 결과
 *   bias = intercept
 *   iterations / finalLoss = 수렴 정보
 *   trainN = 학습 사용 row 수
 *
 * 자가 의심: 본 함수는 pure mathematical fit. learned weights 의 production
 * 적용 결정은 호출 site (backtest harness) 의 evidence pack 평가 후.
 */
export function fitWeightedLogistic(
  factorsList: FactorMap[],
  homeWinList: boolean[],
  opts: FitOptions = {},
): FitResult {
  if (factorsList.length !== homeWinList.length) {
    throw new Error(
      `fitWeightedLogistic: factorsList.length=${factorsList.length} !== homeWinList.length=${homeWinList.length}`,
    );
  }
  if (factorsList.length === 0) {
    throw new Error('fitWeightedLogistic: empty dataset');
  }

  const {
    lambda = 0.01,
    lr = 0.5,
    maxIter = 5000,
    tol = 1e-8,
    clamp = 2,
    neutral = 0.5,
  } = opts;

  const X = vectorizeFactors(factorsList, neutral);
  const y = homeWinList.map((h) => (h ? 1 : 0));
  const d = ACTIVE_FACTOR_KEYS.length;
  const w = new Array(d).fill(0);
  let b = 0;

  let prevLoss = Infinity;
  let it = 0;
  for (; it < maxIter; it++) {
    // forward + loss
    const preds = new Array(X.length);
    let loss = 0;
    for (let i = 0; i < X.length; i++) {
      const z = dot(X[i], w) + b;
      const p = sigmoid(z);
      preds[i] = p;
      const pc = Math.max(1e-12, Math.min(1 - 1e-12, p));
      loss += -(y[i] * Math.log(pc) + (1 - y[i]) * Math.log(1 - pc));
    }
    loss /= X.length;
    let reg = 0;
    for (let j = 0; j < d; j++) reg += w[j] * w[j];
    loss += 0.5 * lambda * reg;

    if (Math.abs(prevLoss - loss) < tol) break;
    prevLoss = loss;

    // gradient
    const gw = new Array(d).fill(0);
    let gb = 0;
    for (let i = 0; i < X.length; i++) {
      const err = preds[i] - y[i];
      for (let j = 0; j < d; j++) gw[j] += err * X[i][j];
      gb += err;
    }
    for (let j = 0; j < d; j++) {
      gw[j] = gw[j] / X.length + lambda * w[j];
      w[j] -= lr * gw[j];
    }
    b -= lr * (gb / X.length);
  }

  const rawWeights: Record<FactorKey, number> = {} as Record<FactorKey, number>;
  for (let j = 0; j < d; j++) {
    rawWeights[ACTIVE_FACTOR_KEYS[j]] = Math.round(w[j] * 10000) / 10000;
  }

  return {
    weights: normalizeWeights(rawWeights, clamp),
    rawWeights,
    bias: Math.round(b * 10000) / 10000,
    iterations: it,
    finalLoss: Math.round(prevLoss * 1000000) / 1000000,
    trainN: X.length,
  };
}
