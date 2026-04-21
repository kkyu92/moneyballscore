import type { CalibrationBucket, MetricsSummary } from './types';

/** 확률 clamp. log(0) / log(1) 방지. */
function clampProb(p: number): number {
  if (p < 1e-9) return 1e-9;
  if (p > 1 - 1e-9) return 1 - 1e-9;
  return p;
}

/**
 * 예측 확률 + 실제 결과 배열로 MetricsSummary 계산. 순수 함수.
 *
 * @param probs - p(home win) 배열
 * @param outcomes - 실제 home 승(1) / 패(0) 배열
 */
export function computeMetrics(probs: number[], outcomes: number[]): MetricsSummary {
  if (probs.length !== outcomes.length) {
    throw new Error('probs.length !== outcomes.length');
  }
  const n = probs.length;
  if (n === 0) {
    return { n: 0, brier: 0, logLoss: 0, accuracy: 0, calibration: [] };
  }

  let brierSum = 0;
  let logLossSum = 0;
  let correct = 0;
  for (let i = 0; i < n; i++) {
    const p = probs[i];
    const y = outcomes[i];
    brierSum += (p - y) ** 2;
    const pc = clampProb(p);
    logLossSum += -(y * Math.log(pc) + (1 - y) * Math.log(1 - pc));
    const pred = p >= 0.5 ? 1 : 0;
    if (pred === y) correct++;
  }

  return {
    n,
    brier: brierSum / n,
    logLoss: logLossSum / n,
    accuracy: correct / n,
    calibration: buildCalibration(probs, outcomes, 10),
  };
}

/** 10분할 calibration bucket. [0.0, 0.1), [0.1, 0.2), ..., [0.9, 1.0]. */
export function buildCalibration(
  probs: number[],
  outcomes: number[],
  bins = 10,
): CalibrationBucket[] {
  const buckets: CalibrationBucket[] = [];
  for (let b = 0; b < bins; b++) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    let sumP = 0;
    let sumY = 0;
    let cnt = 0;
    for (let i = 0; i < probs.length; i++) {
      const p = probs[i];
      const inBucket = b === bins - 1 ? p >= lo && p <= hi : p >= lo && p < hi;
      if (inBucket) {
        sumP += p;
        sumY += outcomes[i];
        cnt++;
      }
    }
    buckets.push({
      lo,
      hi,
      n: cnt,
      avgPredicted: cnt > 0 ? sumP / cnt : 0,
      actualRate: cnt > 0 ? sumY / cnt : 0,
    });
  }
  return buckets;
}
