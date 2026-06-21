/**
 * M-V2 v2.1-B-shadow cohort wiring (cycle 1013).
 *
 * 동일 경기에 production (v1.8) row 와 shadow (v2.1-B-shadow) row 양쪽 누적.
 * shadow row 는 quant 재계산만 (debate LLM 호출 X, 비용 0). daily 일별 Brier delta
 * 측정 → /accuracy/shadow page 노출 → n=150 도달 후 production 적용 결정 evidence.
 *
 * 안전: shadow insert 실패해도 production v1.8 insert 영향 X (try/catch 격리).
 */

import {
  SHADOW_WEIGHTS,
  SHADOW_V20_WEIGHTS,
  HOME_ADVANTAGE,
  SHADOW_SCORING_RULE,
  SHADOW_V20_SCORING_RULE,
  clampWinnerProb,
} from '@moneyball/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

const NEUTRAL_FACTOR = 0.5;

export interface ShadowComputeResult {
  homeWinProb: number;
  factorTotal: number;
  appliedFactorCount: number;
}

/**
 * SHADOW_WEIGHTS 안 가중치로 factors JSONB 재가중합 → homeWinProb.
 * predictor.ts 의 산출 공식 (weightedSum / FACTOR_TOTAL + HOME_ADVANTAGE → clamp) 동일.
 *
 * factors 안 weight key 가 부재하면 0.5 neutral fallback. shadow factor (park_weather /
 * umpire_sz) 부재 시 neutral → shadow weight effect 0 (정상 동작).
 */
export function computeShadowPrediction(
  factors: Record<string, number> | null | undefined,
): ShadowComputeResult | null {
  if (!factors || typeof factors !== 'object') return null;

  let weightedSum = 0;
  let factorTotal = 0;
  let appliedFactorCount = 0;

  for (const [key, weight] of Object.entries(SHADOW_WEIGHTS)) {
    factorTotal += weight as number;
    const raw = factors[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      weightedSum += raw * (weight as number);
      if ((weight as number) > 0) appliedFactorCount += 1;
    } else {
      weightedSum += NEUTRAL_FACTOR * (weight as number);
    }
  }

  if (factorTotal === 0) return null;

  let homeWinProb = weightedSum / factorTotal + HOME_ADVANTAGE;
  homeWinProb = clampWinnerProb(homeWinProb);

  return {
    homeWinProb: Math.round(homeWinProb * 1000) / 1000,
    factorTotal,
    appliedFactorCount,
  };
}

/**
 * Brier score delta — winner-centric ((p - outcome)^2).
 * outcome = 1 if homeWin, 0 if away. 양쪽 row 같은 outcome → 단순 차.
 */
export function shadowBrierDelta(
  v18Prob: number,
  shadowProb: number,
  homeWin: boolean,
): { v18Brier: number; shadowBrier: number; delta: number } {
  const outcome = homeWin ? 1 : 0;
  const v18Brier = (v18Prob - outcome) ** 2;
  const shadowBrier = (shadowProb - outcome) ** 2;
  return {
    v18Brier,
    shadowBrier,
    delta: shadowBrier - v18Brier, // 음수 = shadow 가 더 정확
  };
}

export interface ShadowRowInsertInput {
  gameId: number;
  predictedWinnerId: number;
  factors: Record<string, number>;
  baseRowMeta: {
    home_sp_fip: number | null;
    away_sp_fip: number | null;
    home_sp_xfip: number | null;
    away_sp_xfip: number | null;
    home_lineup_woba: number;
    away_lineup_woba: number;
    home_bullpen_fip: number;
    away_bullpen_fip: number;
    home_war_total: number;
    away_war_total: number;
    home_recent_form: number;
    away_recent_form: number;
    head_to_head_rate: number | null;
    park_factor: number;
    home_elo: number;
    away_elo: number;
    home_sfr: number;
    away_sfr: number;
    reasoning: string;
  };
}

export interface ShadowRowInsertResult {
  ok: boolean;
  shadowProb: number | null;
  reason: 'inserted' | 'duplicate' | 'compute_failed' | 'db_error';
  error?: string;
}

/**
 * shadow row insert — production v1.8 insert 직후 호출.
 * failure tolerant — return value 만 호출자에게 전달 (throw X) → v1.8 path 영향 X.
 *
 * @param db        Supabase client (service role)
 * @param input     v1.8 row 의 factors + 기존 row meta + predictedWinnerId
 * @param teamIdMap homeWin 판정용 — input.predictedWinnerId 가 home 이면 home 우세
 */
export async function insertShadowRow(
  db: SupabaseClient,
  input: ShadowRowInsertInput,
): Promise<ShadowRowInsertResult> {
  const computed = computeShadowPrediction(input.factors);
  if (!computed) {
    return { ok: false, shadowProb: null, reason: 'compute_failed' };
  }

  const payload = {
    game_id: input.gameId,
    prediction_type: 'pre_game',
    predicted_winner: input.predictedWinnerId,
    confidence: Math.abs(computed.homeWinProb - 0.5) * 2,
    ...input.baseRowMeta,
    model_version: SHADOW_SCORING_RULE,
    debate_version: null,
    scoring_rule: SHADOW_SCORING_RULE,
    factors: input.factors,
    predicted_at: new Date().toISOString(),
  };

  try {
    const result = await db.from('predictions').insert(payload).select('id');
    if (result.error) {
      // race condition — 다른 cron 이 먼저 shadow row 박제. UNIQUE 23505 = silent skip.
      if (result.error.code === '23505') {
        return { ok: true, shadowProb: computed.homeWinProb, reason: 'duplicate' };
      }
      return {
        ok: false,
        shadowProb: computed.homeWinProb,
        reason: 'db_error',
        error: result.error.message,
      };
    }
    return { ok: true, shadowProb: computed.homeWinProb, reason: 'inserted' };
  } catch (e) {
    return {
      ok: false,
      shadowProb: computed.homeWinProb,
      reason: 'db_error',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * v2.0-shadow compute — SHADOW_V20_WEIGHTS 기반 (plan #14 C1a, cycle 1019).
 * computeShadowPrediction 와 동일 산출 공식 (weightedSum / FACTOR_TOTAL + HOME_ADVANTAGE → clamp).
 * SHADOW_V20_WEIGHTS = v1.8 base + 3 factor bump (elo/bullpen_fip/recent_form).
 * shadow factor (park_weather/umpire_sz) X — production 10 factor 만 사용.
 */
export function computeShadowPredictionV20(
  factors: Record<string, number> | null | undefined,
): ShadowComputeResult | null {
  if (!factors || typeof factors !== 'object') return null;

  let weightedSum = 0;
  let factorTotal = 0;
  let appliedFactorCount = 0;

  for (const [key, weight] of Object.entries(SHADOW_V20_WEIGHTS)) {
    factorTotal += weight as number;
    const raw = factors[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      weightedSum += raw * (weight as number);
      if ((weight as number) > 0) appliedFactorCount += 1;
    } else {
      weightedSum += NEUTRAL_FACTOR * (weight as number);
    }
  }

  if (factorTotal === 0) return null;

  let homeWinProb = weightedSum / factorTotal + HOME_ADVANTAGE;
  homeWinProb = clampWinnerProb(homeWinProb);

  return {
    homeWinProb: Math.round(homeWinProb * 1000) / 1000,
    factorTotal,
    appliedFactorCount,
  };
}

/**
 * v2.0-shadow row insert — production v1.8 insert + v2.1-B-shadow insert 직후 호출.
 * insertShadowRow 와 동일 패턴 (failure tolerant, throw X). v1.8 + v2.1-B-shadow path 영향 X.
 * plan #14 C1a (cycle 1019) — n=150 wait 시간 절반 evidence 누적.
 */
export async function insertShadowRowV20(
  db: SupabaseClient,
  input: ShadowRowInsertInput,
): Promise<ShadowRowInsertResult> {
  const computed = computeShadowPredictionV20(input.factors);
  if (!computed) {
    return { ok: false, shadowProb: null, reason: 'compute_failed' };
  }

  const payload = {
    game_id: input.gameId,
    prediction_type: 'pre_game',
    predicted_winner: input.predictedWinnerId,
    confidence: Math.abs(computed.homeWinProb - 0.5) * 2,
    ...input.baseRowMeta,
    model_version: SHADOW_V20_SCORING_RULE,
    debate_version: null,
    scoring_rule: SHADOW_V20_SCORING_RULE,
    factors: input.factors,
    predicted_at: new Date().toISOString(),
  };

  try {
    const result = await db.from('predictions').insert(payload).select('id');
    if (result.error) {
      if (result.error.code === '23505') {
        return { ok: true, shadowProb: computed.homeWinProb, reason: 'duplicate' };
      }
      return {
        ok: false,
        shadowProb: computed.homeWinProb,
        reason: 'db_error',
        error: result.error.message,
      };
    }
    return { ok: true, shadowProb: computed.homeWinProb, reason: 'inserted' };
  } catch (e) {
    return {
      ok: false,
      shadowProb: computed.homeWinProb,
      reason: 'db_error',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
