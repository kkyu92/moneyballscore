// v2.1-B 가중치 — plan #8 backtest 결과 (partial Wayback 회귀, sfr 0 / h2h 2%, Brier 0.24830).
// /v2-preview 사용자 가시 사전 evidence. N=150 도달 후 prod 적용 결정 → 변경 가능.
//
// 가중치 합 0.85 (DEFAULT_WEIGHTS 와 동일). 예측 산출 공식 = packages/kbo-data
// src/engine/predictor.ts 동일 — weightedSum / FACTOR_TOTAL + HOME_ADVANTAGE → clamp [0.15, 0.85].
// 본 모듈은 이미 저장된 pre_game predictions.factors JSONB 를 재가중치 적용해 미리보기 산출.

export const V2_1_B_WEIGHTS = {
  sp_fip: 0.16,
  sp_xfip: 0.05,
  lineup_woba: 0.17,
  bullpen_fip: 0.11,
  recent_form: 0.12,
  war: 0.09,
  head_to_head: 0.02,
  park_factor: 0.04,
  elo: 0.09,
  sfr: 0.00,
} as const;

export type V2WeightKey = keyof typeof V2_1_B_WEIGHTS;

const HOME_ADVANTAGE = 0.015;
const CLAMP_LO = 0.15;
const CLAMP_HI = 0.85;
const NEUTRAL_FACTOR = 0.5;

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

  let homeWinProb = weightedSum / factorTotal + HOME_ADVANTAGE;
  homeWinProb = Math.max(CLAMP_LO, Math.min(CLAMP_HI, homeWinProb));

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
