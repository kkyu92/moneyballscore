import { DEFAULT_WEIGHTS } from "@moneyball/shared";

export interface FactorSample {
  factors: Record<string, number>;
  actualHomeWin: 0 | 1;
}

export interface FactorStat {
  factor: string;
  n: number;
  meanBias: number; // 평균 signed error (positive = 홈팀 과대 예측)
  mae: number; // mean absolute error
  directionalAccuracy: number | null; // 중립(0.45-0.55) 제외한 방향 일치 비율
  directionalN: number;
  correlation: number; // Pearson correlation (value vs actualHomeWin)
  currentWeight: number;
  proposedWeight: number | null; // n < minSamples면 null
}

export interface FactorAccuracyReport {
  totalSamples: number;
  minSamples: number;
  stats: FactorStat[];
  proposedWeightsDelta: number; // 현재 vs 제안 가중치 총 변화량 (L1)
}

const NEUTRAL_BAND = 0.05;

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  if (denom === 0) return 0;
  return num / denom;
}

function computeFactorStat(
  factor: string,
  samples: FactorSample[],
  currentWeight: number,
  minSamples: number
): FactorStat {
  const values: number[] = [];
  const actuals: number[] = [];
  let absSum = 0;
  let signedSum = 0;
  let dirCorrect = 0;
  let dirN = 0;

  for (const s of samples) {
    const v = s.factors[factor];
    if (typeof v !== "number") continue;
    const actual = s.actualHomeWin;
    values.push(v);
    actuals.push(actual);
    const error = v - actual;
    absSum += Math.abs(error);
    signedSum += error;
    if (Math.abs(v - 0.5) > NEUTRAL_BAND) {
      dirN += 1;
      const predictedHome = v > 0.5;
      const actualHome = actual === 1;
      if (predictedHome === actualHome) dirCorrect += 1;
    }
  }

  const n = values.length;
  const meanBias = n > 0 ? signedSum / n : 0;
  const mae = n > 0 ? absSum / n : 0;
  const directionalAccuracy = dirN > 0 ? dirCorrect / dirN : null;
  const correlation = pearsonCorrelation(values, actuals);

  return {
    factor,
    n,
    meanBias,
    mae,
    directionalAccuracy,
    directionalN: dirN,
    correlation,
    currentWeight,
    proposedWeight: null,
  };
}

function proposeWeights(
  stats: FactorStat[],
  minSamples: number
): FactorStat[] {
  const eligible = stats.filter((s) => s.n >= minSamples);
  if (eligible.length === 0) {
    return stats.map((s) => ({ ...s, proposedWeight: null }));
  }

  // 팩터별 "유용성 점수": 현재 weight × |correlation|
  // 음의 correlation은 예측 반대 방향 → 가중치 0 제안
  const scores = new Map<string, number>();
  let totalScore = 0;
  for (const s of eligible) {
    const clampedCorr = Math.max(0, s.correlation); // 음수는 0으로
    const score = s.currentWeight * clampedCorr;
    scores.set(s.factor, score);
    totalScore += score;
  }

  if (totalScore === 0) {
    return stats.map((s) => ({ ...s, proposedWeight: null }));
  }

  // 원래 eligible 가중치 합을 유지하면서 재분배
  const eligibleWeightSum = eligible.reduce(
    (acc, s) => acc + s.currentWeight,
    0
  );

  return stats.map((s) => {
    if (s.n < minSamples) return { ...s, proposedWeight: null };
    const score = scores.get(s.factor) ?? 0;
    const proposed = (score / totalScore) * eligibleWeightSum;
    return {
      ...s,
      proposedWeight: Math.round(proposed * 1000) / 1000,
    };
  });
}

export function analyzeFactorAccuracy(
  samples: FactorSample[],
  options: { minSamples?: number } = {}
): FactorAccuracyReport {
  const minSamples = options.minSamples ?? 30;
  const factorKeys = Object.keys(DEFAULT_WEIGHTS);

  const rawStats = factorKeys.map((factor) =>
    computeFactorStat(
      factor,
      samples,
      DEFAULT_WEIGHTS[factor as keyof typeof DEFAULT_WEIGHTS],
      minSamples
    )
  );
  const stats = proposeWeights(rawStats, minSamples);

  const proposedWeightsDelta = stats.reduce((acc, s) => {
    if (s.proposedWeight == null) return acc;
    return acc + Math.abs(s.proposedWeight - s.currentWeight);
  }, 0);

  return {
    totalSamples: samples.length,
    minSamples,
    stats,
    proposedWeightsDelta: Math.round(proposedWeightsDelta * 1000) / 1000,
  };
}
