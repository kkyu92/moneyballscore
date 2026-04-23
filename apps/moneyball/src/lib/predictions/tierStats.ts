import { classifyWinnerProb, type WinnerConfidenceTier } from '@moneyball/shared';
import type { TierRates } from '@/components/dashboard/AccuracySummary';

type Predictionlike = {
  is_correct: boolean | null;
  reasoning?: { homeWinProb?: number | null } | null;
};

export function emptyTierRates(): TierRates {
  return {
    confident: { correct: 0, total: 0 },
    lean: { correct: 0, total: 0 },
    tossup: { correct: 0, total: 0 },
  };
}

/**
 * predictions 리스트 (is_correct 확정된 것만 권장) → 3단계 tier 별 집계.
 * reasoning.homeWinProb 누락 시 0.5 로 간주 → tossup 으로 분류.
 */
export function buildTierRates(predictions: Predictionlike[]): TierRates {
  const rates = emptyTierRates();
  for (const p of predictions) {
    if (p.is_correct == null) continue;
    const hwp = p.reasoning?.homeWinProb ?? 0.5;
    const tier: WinnerConfidenceTier = classifyWinnerProb(hwp);
    rates[tier].total += 1;
    if (p.is_correct) rates[tier].correct += 1;
  }
  return rates;
}
