// v2.1-B 가중치 — packages/shared 단일 source (cycle 1013 이관). 본 모듈은 backward-compat
// re-export + apps/moneyball /v2-preview 의 quant 재계산 path.
// 예측 산출 공식 = packages/kbo-data src/engine/predictor.ts 동일 — weightedSum /
// FACTOR_TOTAL + HOME_ADVANTAGE → clampWinnerProb (WINNER_PROB_CLAMP_MIN/MAX).
// 본 모듈은 이미 저장된 pre_game predictions.factors JSONB 를 재가중치 적용해 미리보기 산출.

import { V2_1_B_WEIGHTS as SHARED_V2_1_B_WEIGHTS, clampWinnerProb, NEUTRAL_FACTOR } from '@moneyball/shared';

export const V2_1_B_WEIGHTS = SHARED_V2_1_B_WEIGHTS;

export type V2WeightKey = keyof typeof V2_1_B_WEIGHTS;

const HOME_ADVANTAGE = 0.015;

export interface V2PreviewResult {
  homeWinProb: number;
  weightedSum: number;
  factorTotal: number;
  appliedFactorCount: number;
  missingFactorKeys: V2WeightKey[];
}

export function applyV2_1_BWeights(
  factors: Record<string, number> | null | undefined,
): V2PreviewResult | null {
  if (!factors || typeof factors !== 'object') return null;

  let weightedSum = 0;
  let factorTotal = 0;
  let appliedFactorCount = 0;
  const missingFactorKeys: V2WeightKey[] = [];

  for (const [rawKey, weight] of Object.entries(V2_1_B_WEIGHTS)) {
    const key = rawKey as V2WeightKey;
    factorTotal += weight;
    const raw = factors[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      weightedSum += raw * weight;
      if (weight > 0) appliedFactorCount += 1;
    } else {
      weightedSum += NEUTRAL_FACTOR * weight;
      if (weight > 0) missingFactorKeys.push(key);
    }
  }

  if (factorTotal === 0) return null;

  const homeWinProb = clampWinnerProb(weightedSum / factorTotal + HOME_ADVANTAGE);

  return { homeWinProb, weightedSum, factorTotal, appliedFactorCount, missingFactorKeys };
}

export interface V2PreviewDelta {
  v18: number;
  v21b: number;
  deltaPp: number;
}

export function computeDelta(v18Prob: number, v21bProb: number): V2PreviewDelta {
  return {
    v18: v18Prob,
    v21b: v21bProb,
    deltaPp: (v21bProb - v18Prob) * 100,
  };
}
