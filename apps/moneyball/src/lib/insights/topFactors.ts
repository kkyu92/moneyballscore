import {
  FACTOR_LABELS,
  FACTOR_LABELS_EN,
  NEUTRAL_HI,
  NEUTRAL_LO,
} from "@/lib/predictions/factorLabels";
import { NEUTRAL_FACTOR } from "@moneyball/shared";

export const TOP_FACTOR_LIMIT = 3;
export { NEUTRAL_HI, NEUTRAL_LO };

interface TopFactor {
  key: string;
  label: string;
  pct: number;
  favorable: "home" | "away" | "neutral";
}

// locale param — en/mlb/insights + en/mlb/insights/[date] 가 이 함수를 호출하면서
// FACTOR_LABELS(한글 고정)만 반환해 영문 페이지에 한글 팩터 라벨이 누출되던 drift 정정
// (review-code heavy, cycle 3232). FACTOR_LABELS_EN 은 factorLabels.ts 에 이미 존재했으나
// 이 함수에서 미사용이었음.
export function selectTopFactors(
  factors: Record<string, number> | null,
  limit = TOP_FACTOR_LIMIT,
  locale: "ko" | "en" = "ko",
): TopFactor[] {
  if (!factors) return [];
  const labels = locale === "en" ? FACTOR_LABELS_EN : FACTOR_LABELS;
  return Object.entries(factors)
    .filter(([key]) => key in FACTOR_LABELS)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
    .map(([key, value]) => ({
      key,
      label: labels[key] ?? FACTOR_LABELS[key],
      value,
      dist: Math.abs(value - NEUTRAL_FACTOR),
    }))
    .sort((a, b) => b.dist - a.dist)
    .slice(0, limit)
    .map(({ key, label, value }) => ({
      key,
      label,
      pct: Math.round(value * 100),
      favorable:
        value > NEUTRAL_HI ? "home" : value < NEUTRAL_LO ? "away" : "neutral",
    }));
}
