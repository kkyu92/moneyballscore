import { DEFAULT_WEIGHTS, shortTeamName, type TeamCode } from "@moneyball/shared";
import { FACTOR_LABELS, FACTOR_TIPS } from "@/lib/predictions/factorLabels";

interface FactorBreakdownProps {
  factors: Record<string, number>;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  details?: {
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
  };
}

export function FactorBreakdown({ factors, homeTeam, awayTeam }: FactorBreakdownProps) {
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

          return (
            <div key={key} className="flex items-center gap-2">
              <span
                className="text-sm text-gray-600 dark:text-gray-300 w-20 shrink-0 text-right cursor-help"
                title={FACTOR_TIPS[key] || ''}
              >
                {FACTOR_LABELS[key] || key}
              </span>
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
