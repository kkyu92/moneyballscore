import Link from "next/link";
import { DEFAULT_WEIGHTS, NEUTRAL_FACTOR, shortTeamName, type TeamCode } from "@moneyball/shared";
import {
  FACTOR_GLOSSARY_ANCHORS,
  FACTOR_LABELS,
  FACTOR_TIPS,
  NEUTRAL_HI,
  NEUTRAL_LO,
} from "@/lib/predictions/factorLabels";

interface FactorDetails {
  homeSPFip?: number;
  awaySPFip?: number;
  homeSPxFip?: number;
  awaySPxFip?: number;
  homeWoba?: number;
  awayWoba?: number;
  homeBullpenFip?: number;
  awayBullpenFip?: number;
  homeWar?: number;
  awayWar?: number;
  homeForm?: number;
  awayForm?: number;
  h2hRate?: number;
  parkFactor?: number;
  homeElo?: number;
  awayElo?: number;
  homeSfr?: number;
  awaySfr?: number;
  // factor 11/12 (shadow cohort, production weight=0)
  parkWeatherTempC?: number;
  parkWeatherWindMps?: number;
  parkWeatherPrecipMm?: number;
  umpireName?: string;
  umpireSzWidenPct?: number;
}

interface FactorBreakdownProps {
  factors: Record<string, number>;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  details?: FactorDetails;
  gameId?: number | string;
  /** chart variant — true 시 contribution %p column + factor 11/12 row 강제 렌더 (값 nullable → "측정 중"). */
  chart?: boolean;
}

// factor 11/12 = shadow-only (production weight=0). chart=true 시에만 렌더.
const SHADOW_FACTOR_KEYS = ["park_weather", "umpire_sz"] as const;
const SHADOW_FACTOR_LABELS: Record<string, { label: string; tip: string }> = {
  park_weather: { label: "구장 날씨", tip: "Open-Meteo 기상 (저온 / 외야 바람 / 강수) — shadow 측정" },
  umpire_sz: { label: "주심 SZ", tip: "주심 strike zone bias (umpire_stats) — shadow 측정" },
};

function getStatLabel(
  key: string,
  d: FactorDetails,
  awayName: string,
  homeName: string,
): string | null {
  switch (key) {
    case "sp_fip":
      if (d.awaySPFip != null && d.homeSPFip != null)
        return `${awayName} ${d.awaySPFip.toFixed(2)} · ${homeName} ${d.homeSPFip.toFixed(2)}`;
      break;
    case "sp_xfip":
      if (d.awaySPxFip != null && d.homeSPxFip != null)
        return `${awayName} ${d.awaySPxFip.toFixed(2)} · ${homeName} ${d.homeSPxFip.toFixed(2)}`;
      break;
    case "lineup_woba":
      if (d.awayWoba != null && d.homeWoba != null)
        return `${awayName} ${d.awayWoba.toFixed(3)} · ${homeName} ${d.homeWoba.toFixed(3)}`;
      break;
    case "bullpen_fip":
      if (d.awayBullpenFip != null && d.homeBullpenFip != null)
        return `${awayName} ${d.awayBullpenFip.toFixed(2)} · ${homeName} ${d.homeBullpenFip.toFixed(2)}`;
      break;
    case "recent_form":
      if (d.awayForm != null && d.homeForm != null)
        return `${awayName} ${Math.round(d.awayForm * 100)}% · ${homeName} ${Math.round(d.homeForm * 100)}%`;
      break;
    case "war":
      if (d.awayWar != null && d.homeWar != null)
        return `${awayName} ${d.awayWar.toFixed(1)} · ${homeName} ${d.homeWar.toFixed(1)}`;
      break;
    case "head_to_head":
      if (d.h2hRate != null) {
        const awayPct = Math.round((1 - d.h2hRate) * 100);
        const homePct = Math.round(d.h2hRate * 100);
        return `${awayName} ${awayPct}% · ${homeName} ${homePct}%`;
      }
      break;
    case "park_factor":
      if (d.parkFactor != null)
        return `파크팩터 ${d.parkFactor.toFixed(2)}`;
      break;
    case "elo":
      if (d.awayElo != null && d.homeElo != null)
        return `${awayName} ${Math.round(d.awayElo)} · ${homeName} ${Math.round(d.homeElo)}`;
      break;
    case "sfr":
      if (d.awaySfr != null && d.homeSfr != null)
        return `${awayName} ${d.awaySfr.toFixed(1)} · ${homeName} ${d.homeSfr.toFixed(1)}`;
      break;
    case "park_weather": {
      const parts: string[] = [];
      if (d.parkWeatherTempC != null) parts.push(`기온 ${d.parkWeatherTempC.toFixed(1)}°C`);
      if (d.parkWeatherWindMps != null) parts.push(`바람 ${d.parkWeatherWindMps.toFixed(1)}m/s`);
      if (d.parkWeatherPrecipMm != null) parts.push(`강수 ${d.parkWeatherPrecipMm.toFixed(1)}mm`);
      return parts.length > 0 ? parts.join(" · ") : null;
    }
    case "umpire_sz":
      if (d.umpireName) {
        const widen =
          d.umpireSzWidenPct != null
            ? ` (${d.umpireSzWidenPct >= 0 ? "+" : ""}${d.umpireSzWidenPct.toFixed(1)}%)`
            : "";
        return `주심 ${d.umpireName}${widen}`;
      }
      break;
  }
  return null;
}

/**
 * factor 의 win prob 기여도 (percentage point).
 * value ∈ [0,1], NEUTRAL_FACTOR=중립. NEUTRAL_FACTOR 에서 멀어진 만큼 × weight × 2 = home prob 변화 (-1 ~ +1).
 * 100 곱해서 %p 단위로 표시.
 * 음수 = away 유리, 양수 = home 유리.
 */
export function contributionPp(value: number, weight: number): number {
  return (value - NEUTRAL_FACTOR) * weight * 2 * 100;
}

function labelFor(key: string): string {
  if (key in FACTOR_LABELS) return FACTOR_LABELS[key];
  if (key in SHADOW_FACTOR_LABELS) return SHADOW_FACTOR_LABELS[key].label;
  return key;
}

function tipFor(key: string): string {
  if (key in FACTOR_TIPS) return FACTOR_TIPS[key];
  if (key in SHADOW_FACTOR_LABELS) return SHADOW_FACTOR_LABELS[key].tip;
  return "";
}

export function FactorBreakdown({
  factors,
  homeTeam,
  awayTeam,
  details,
  gameId,
  chart = false,
}: FactorBreakdownProps) {
  const homeName = shortTeamName(homeTeam);
  const awayName = shortTeamName(awayTeam);

  // chart=true 시 shadow factor 11/12 row 강제 노출 (값 nullable → "측정 중" 라벨).
  // chart=false (기본) 시 factors map 의 키만 (기존 동작 유지).
  const baseEntries = Object.entries(factors).filter(
    ([key]) => key in DEFAULT_WEIGHTS,
  );

  const shadowEntries: [string, number | null][] = chart
    ? SHADOW_FACTOR_KEYS.map((k) => [
        k,
        k in factors ? factors[k] : null,
      ])
    : [];

  // de-dup (factors 안 shadow factor 키 이미 있으면 baseEntries 안 포함 → shadowEntries 에서 제외)
  const dedupedShadow = shadowEntries.filter(
    ([k]) => !baseEntries.some(([bk]) => bk === k),
  );

  const allEntries: [string, number | null][] = [
    ...baseEntries.map(([k, v]) => [k, v] as [string, number | null]),
    ...dedupedShadow,
  ];

  const sortedFactors = allEntries.sort(([a], [b]) => {
    const wa = DEFAULT_WEIGHTS[a as keyof typeof DEFAULT_WEIGHTS] ?? 0;
    const wb = DEFAULT_WEIGHTS[b as keyof typeof DEFAULT_WEIGHTS] ?? 0;
    return wb - wa;
  });

  const anchorId = gameId !== undefined ? `factor-breakdown-${gameId}` : undefined;

  return (
    <div
      id={anchorId}
      data-variant={chart ? "chart" : "default"}
      className={`bg-gray-50 dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4${anchorId ? " scroll-mt-20" : ""}`}
    >
      <h4 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3">
        예측 근거 (팩터별 분석)
        {chart && (
          <span className="ml-2 text-[10px] text-gray-400 dark:text-gray-500 font-normal">
            · 기여도 chart 모드
          </span>
        )}
      </h4>
      <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 flex justify-between">
        <span>← {awayName} 유리</span>
        <span>{homeName} 유리 →</span>
      </div>
      <div className="space-y-2">
        {sortedFactors.map(([key, value]) => {
          const weight = DEFAULT_WEIGHTS[key as keyof typeof DEFAULT_WEIGHTS] ?? 0;
          const pct = Math.round(weight * 100);
          const isShadow = SHADOW_FACTOR_KEYS.includes(
            key as (typeof SHADOW_FACTOR_KEYS)[number],
          );
          const isMeasuring = value == null;

          // value: 0=원정유리, NEUTRAL_FACTOR=중립, 1=홈유리. null 시 중립으로 표시.
          const safeValue = value ?? NEUTRAL_FACTOR;
          const barPct = Math.round(safeValue * 100);
          const favorable = isMeasuring
            ? "measuring"
            : safeValue > NEUTRAL_HI
              ? "home"
              : safeValue < NEUTRAL_LO
                ? "away"
                : "neutral";

          const favorLabel =
            favorable === "home"
              ? `${homeName} 우위`
              : favorable === "away"
                ? `${awayName} 우위`
                : favorable === "measuring"
                  ? "측정 중"
                  : "비슷";
          const favorColor =
            favorable === "home"
              ? "text-brand-500"
              : favorable === "away"
                ? "text-[var(--color-away)]"
                : favorable === "measuring"
                  ? "text-[var(--color-factor-neutral)]"
                  : "text-gray-400 dark:text-gray-500";

          const statLabel = details ? getStatLabel(key, details, awayName, homeName) : null;
          const contrib = !isMeasuring ? contributionPp(safeValue, weight) : null;

          return (
            <div
              key={key}
              data-factor={key}
              data-shadow={isShadow ? "true" : "false"}
              className="flex items-center gap-2"
            >
              <div className="w-20 shrink-0 text-right">
                {FACTOR_GLOSSARY_ANCHORS[key] ? (
                  <Link
                    href={`/glossary#${FACTOR_GLOSSARY_ANCHORS[key]}`}
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-brand-500 hover:underline underline-offset-2"
                    title={tipFor(key)}
                  >
                    {labelFor(key)}
                  </Link>
                ) : (
                  <span
                    className="text-sm text-gray-600 dark:text-gray-300 cursor-help"
                    title={tipFor(key)}
                  >
                    {labelFor(key)}
                    {isShadow && (
                      <span className="ml-1 text-[9px] text-[var(--color-factor-neutral)] align-top">
                        shadow
                      </span>
                    )}
                  </span>
                )}
                {statLabel && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight mt-0.5">
                    {statLabel}
                  </p>
                )}
              </div>
              <span className="text-sm text-gray-400 dark:text-gray-500 w-8 shrink-0 text-right">
                {pct}%
              </span>
              <div
                className={`flex-1 h-4 rounded-full relative overflow-hidden ${
                  isMeasuring
                    ? "bg-gray-100 dark:bg-gray-800"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-400 dark:bg-gray-500 z-10" />
                {isMeasuring ? null : barPct >= 50 ? (
                  <div
                    className="absolute top-0 bottom-0 bg-brand-500 rounded-r-full"
                    style={{
                      left: "50%",
                      width: `${barPct - 50}%`,
                    }}
                  />
                ) : (
                  <div
                    className="absolute top-0 bottom-0 bg-[var(--color-away)] rounded-l-full"
                    style={{
                      right: "50%",
                      width: `${50 - barPct}%`,
                    }}
                  />
                )}
              </div>
              <span className={`text-sm font-medium w-28 shrink-0 ${favorColor}`}>
                {favorLabel}
              </span>
              {chart && (
                <span
                  data-contribution-pp
                  className={`text-xs font-mono w-16 shrink-0 text-right ${
                    contrib == null
                      ? "text-[var(--color-factor-neutral)]"
                      : contrib > 0
                        ? "text-brand-500"
                        : contrib < 0
                          ? "text-[var(--color-away)]"
                          : "text-gray-400 dark:text-gray-500"
                  }`}
                  title="홈팀 승률 기여도 (percentage point)"
                >
                  {contrib == null
                    ? "—"
                    : `${contrib > 0 ? "+" : ""}${contrib.toFixed(1)}pp`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
