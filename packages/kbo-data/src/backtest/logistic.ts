/**
 * 순수 JS logistic regression. sklearn 등 외부 의존 없이 batch GD + L2.
 *
 * KBO 경기 규모 (N ≈ 2,000, features ≤ 10) 에서는 1s 이내 수렴.
 * Hessian diagonal 로 계수별 SE 근사 계산 → 95% CI 비교.
 */

import type { GameFeatures } from './types';

export interface LogisticModel {
  weights: number[];
  intercept: number;
  featureNames: string[];
  iterations: number;
  finalLoss: number;
}

export interface TrainOptions {
  lambda?: number; // L2 penalty (default 0.01)
  lr?: number; // learning rate (default 0.5)
  maxIter?: number; // default 5000
  tol?: number; // convergence threshold on loss change (default 1e-8)
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
 * GameFeatures → 표준화된 입력 벡터.
 * 각 축을 대략 [-1, 1] 근방으로 스케일링 — 수렴 안정성.
 */
export function vectorize(f: GameFeatures): number[] {
  const eloDiff = (f.homeElo - f.awayElo) / 400; // Elo 400 = 10배 승률비
  const hForm = f.homeForm ?? 0.5;
  const aForm = f.awayForm ?? 0.5;
  const formDiff = hForm - aForm; // 보통 ±0.3
  const h2hN = f.h2hHomeWins + f.h2hAwayWins;
  const h2hShift = h2hN >= 2 ? f.h2hHomeWins / h2hN - 0.5 : 0;
  const parkShift = (f.parkPf - 100) / 10; // parkPf 92-108 → ±0.8
  return [eloDiff, formDiff, h2hShift, parkShift];
}

export const FEATURE_NAMES = ['eloDiff/400', 'formDiff', 'h2hShift', 'parkShift/10'];

/**
 * Batch gradient descent 로 logistic regression 학습.
 * L2 regularization (intercept 는 penalize 하지 않음, 표준 관례).
 */
export function trainLogistic(
  X: number[][],
  y: number[],
  opts: TrainOptions = {},
): LogisticModel {
  if (X.length !== y.length) throw new Error('X.length !== y.length');
  if (X.length === 0) throw new Error('empty dataset');

  const { lambda = 0.01, lr = 0.5, maxIter = 5000, tol = 1e-8 } = opts;
  const d = X[0].length;
  const w = new Array(d).fill(0);
  let b = 0;

  let prevLoss = Infinity;
  let it = 0;
  for (; it < maxIter; it++) {
    // forward
    const preds = new Array(X.length);
    let loss = 0;
    for (let i = 0; i < X.length; i++) {
      const z = dot(X[i], w) + b;
      const p = sigmoid(z);
      preds[i] = p;
      // LogLoss (numerically safe)
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

  return {
    weights: w,
    intercept: b,
    featureNames: FEATURE_NAMES,
    iterations: it,
    finalLoss: prevLoss,
  };
}

/** 학습된 모델로 배치 예측. */
export function predict(model: LogisticModel, X: number[][]): number[] {
  return X.map((x) => sigmoid(dot(x, model.weights) + model.intercept));
}

/**
 * 계수별 표준오차 (Fisher information diagonal 근사).
 * SE_j ≈ 1 / sqrt(Σ p*(1-p)*x_j^2).
 */
export function coefficientStdErrors(
  model: LogisticModel,
  X: number[][],
): number[] {
  const probs = predict(model, X);
  const d = model.weights.length;
  const se = new Array(d).fill(0);
  for (let j = 0; j < d; j++) {
    let info = 0;
    for (let i = 0; i < X.length; i++) {
      const p = probs[i];
      info += p * (1 - p) * X[i][j] * X[i][j];
    }
    se[j] = info > 0 ? 1 / Math.sqrt(info) : Infinity;
  }
  return se;
}
