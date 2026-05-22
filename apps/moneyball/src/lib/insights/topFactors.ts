import {
  FACTOR_LABELS,
  NEUTRAL_HI,
  NEUTRAL_LO,
} from "@/lib/predictions/factorLabels";

export const TOP_FACTOR_LIMIT = 3;
export { NEUTRAL_HI, NEUTRAL_LO };

export interface TopFactor {
  key: string;
  label: string;
  pct: number;
  favorable: "home" | "away" | "neutral";
}

export function selectTopFactors(
  factors: Record<string, number> | null,
  limit = TOP_FACTOR_LIMIT,
): TopFactor[] {
  if (!factors) return [];
  return Object.entries(factors)
    .filter(([key]) => key in FACTOR_LABELS)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
    .map(([key, value]) => ({
      key,
      label: FACTOR_LABELS[key],
      value,
      dist: Math.abs(value - 0.5),
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
