import { DEFAULT_WEIGHTS, shortTeamName, type TeamCode } from "@moneyball/shared";
import { FACTOR_LABELS, FACTOR_TIPS } from "@/lib/predictions/factorLabels";

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
}

interface FactorBreakdownProps {
  factors: Record<string, number>;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  details?: FactorDetails;
}

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
  }
  return null;
}

export function FactorBreakdown({ factors, homeTeam, awayTeam, details }: FactorBreakdownProps) {
  const homeName = shortTeamName(homeTeam);
  const awayName = shortTeamName(awayTeam);

  const sortedFactors = Object.entries(factors)
    .filter(([key]) => key in DEFAULT_WEIGHTS)
    .sort(([a], [b]) => {
      const wa = DEFAULT_WEIGHTS[a as keyof typeof DEFAULT_WEIGHTS] || 0;
      const wb = DEFAULT_WEIGHTS[b as keyof typeof DEFAULT_WEIGHTS] || 0;
      return wb - wa;
    });

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
      <h4 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3">예측 근거 (팩터별 분석)</h4>
      <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 flex justify-between">
        <span>← {awayName} 유리</span>
        <span>{homeName} 유리 →</span>
      </div>
      <div className="space-y-2">
        {sortedFactors.map(([key, value]) => {
          const weight = DEFAULT_WEIGHTS[key as keyof typeof DEFAULT_WEIGHTS] || 0;
          const pct = Math.round(weight * 100);
          // value: 0=원정유리, 0.5=중립, 1=홈유리
          const barPct = Math.round(value * 100);
          const favorable = value > 0.55 ? "home" : value < 0.45 ? "away" : "neutral";

          const favorLabel =
            favorable === "home" ? `${homeName} 우위` :
            favorable === "away" ? `${awayName} 우위` : "비슷";
          const favorColor =
            favorable === "home" ? "text-brand-500" :
            favorable === "away" ? "text-[var(--color-away)]" : "text-gray-400 dark:text-gray-500";

          const statLabel = details ? getStatLabel(key, details, awayName, homeName) : null;

          return (
            <div key={key} className="flex items-center gap-2">
              <div className="w-20 shrink-0 text-right">
                <span
                  className="text-sm text-gray-600 dark:text-gray-300 cursor-help"
                  title={FACTOR_TIPS[key] || ''}
                >
                  {FACTOR_LABELS[key] || key}
                </span>
                {statLabel && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight mt-0.5">
                    {statLabel}
                  </p>
                )}
              </div>
              <span className="text-sm text-gray-400 dark:text-gray-500 w-8 shrink-0 text-right">
                {pct}%
              </span>
              <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full relative overflow-hidden">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-400 dark:bg-gray-500 z-10" />
                {barPct >= 50 ? (
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
