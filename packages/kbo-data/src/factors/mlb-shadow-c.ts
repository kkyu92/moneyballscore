export const MILESTONE_TRIGGERS = [27, 60, 150, 300, 1000, 2430] as const;

export interface TrainingSample {
  factors: Record<string, number>;
  homeWon: 0 | 1;
}

export interface BrierInput {
  predicted: number;
  actual: 0 | 1;
}

export function computeBrier(predictions: BrierInput[]): number {
  if (predictions.length === 0) return 0;
  const sum = predictions.reduce((s, p) => s + Math.pow(p.predicted - p.actual, 2), 0);
  return sum / predictions.length;
}

export interface TrainResult {
  weights: Record<string, number>;
  brier: number;
  accuracy: number;
}

export function trainShadowWeights(
  samples: TrainingSample[],
  learningRate = 0.01,
  epochs = 100,
): TrainResult {
  if (samples.length === 0) {
    return { weights: {}, brier: 0, accuracy: 0 };
  }

  const factorKeys = Object.keys(samples[0].factors);
  const weights: Record<string, number> = {};
  factorKeys.forEach((k) => {
    weights[k] = 0;
  });
  let bias = 0;

  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const s of samples) {
      let z = bias;
      for (const k of factorKeys) z += weights[k] * s.factors[k];
      const p = sigmoid(z);
      const error = p - s.homeWon;
      for (const k of factorKeys) weights[k] -= learningRate * error * s.factors[k];
      bias -= learningRate * error;
    }
  }

  const predictions: BrierInput[] = samples.map((s) => {
    let z = bias;
    for (const k of factorKeys) z += weights[k] * s.factors[k];
    return { predicted: sigmoid(z), actual: s.homeWon };
  });
  const brier = computeBrier(predictions);
  const accuracy =
    predictions.filter((p) => (p.predicted > 0.5 ? 1 : 0) === p.actual).length /
    predictions.length;

  return { weights, brier, accuracy };
}

export function walkForwardExpanding(
  samples: TrainingSample[],
  monthBoundaries: number[],
): Array<{ month: number; brier: number; cohortSize: number }> {
  const results: Array<{ month: number; brier: number; cohortSize: number }> = [];
  for (let i = 0; i < monthBoundaries.length; i++) {
    const trainEnd = monthBoundaries[i];
    const trainSet = samples.slice(0, trainEnd);
    if (trainSet.length < 10) continue;
    const { brier } = trainShadowWeights(trainSet);
    results.push({ month: i, brier, cohortSize: trainEnd });
  }
  return results;
}
