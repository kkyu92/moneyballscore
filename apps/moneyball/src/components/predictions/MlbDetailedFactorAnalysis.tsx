import { buildMlbFactorDetailRows, type MlbWaterfallBar, type MlbWaterfallInput } from "@moneyball/kbo-data";
import { mlbShortTeamName, MLB_TEAMS, type MlbTeamCode } from "@moneyball/shared";

interface MlbDetailedFactorAnalysisProps {
  homeTeam: MlbTeamCode;
  awayTeam: MlbTeamCode;
  bars: MlbWaterfallBar[];
  values: MlbWaterfallInput;
  locale?: "ko" | "en";
}

/**
 * MLB game-detail 전용 확장 팩터 해설 섹션 — KBO DetailedFactorAnalysis parity.
 * computeMlbWaterfall 이 이미 계산한 bars(contribution/direction)를 그대로 소비,
 * 신규 계산/DB 조회 없음 — MlbFactorWaterfallChart/MlbGameOverview 와 동일 input 공유.
 */
export function MlbDetailedFactorAnalysis({
  homeTeam,
  awayTeam,
  bars,
  values,
  locale = "ko",
}: MlbDetailedFactorAnalysisProps) {
  const homeName = mlbShortTeamName(homeTeam);
  const awayName = mlbShortTeamName(awayTeam);
  const rows = buildMlbFactorDetailRows(bars, values, homeName, awayName, locale);

  if (rows.length === 0) return null;

  const title = locale === "en" ? `${rows.length} Factor Breakdown` : `${rows.length}개 팩터 상세 해설`;
  const weightLabel = (pct: number) => (locale === "en" ? `weight ${pct}%` : `가중치 ${pct}%`);

  return (
    <section
      aria-labelledby="mlb-factor-analysis-title"
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-4"
    >
      <h2
        id="mlb-factor-analysis-title"
        className="text-lg font-bold text-brand-700 dark:text-brand-100"
      >
        {title}
      </h2>

      <div className="space-y-3">
        {rows.map((row) => {
          const favorColor =
            row.favor === "home"
              ? "text-brand-500"
              : row.favor === "away"
                ? "text-[var(--color-away)]"
                : "text-gray-400 dark:text-gray-500";
          const favorLabel =
            row.favor === "home"
              ? locale === "en" ? `${homeName} edge` : `${homeName} 우위`
              : row.favor === "away"
                ? locale === "en" ? `${awayName} edge` : `${awayName} 우위`
                : locale === "en" ? "Even" : "비슷";

          return (
            <article
              key={row.key}
              className="border-l-4 pl-4 py-2 space-y-1"
              style={{
                borderColor:
                  row.favor === "home"
                    ? MLB_TEAMS[homeTeam].color
                    : row.favor === "away"
                      ? MLB_TEAMS[awayTeam].color
                      : "var(--color-factor-neutral)",
              }}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                    {row.label}
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {weightLabel(row.weightPct)}
                  </span>
                </div>
                <div className="text-xs font-mono text-gray-600 dark:text-gray-300">
                  {awayName} {row.awayValueLabel}
                  <span className="mx-1 text-gray-400 dark:text-gray-500">vs</span>
                  {homeName} {row.homeValueLabel}
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                {row.narrative}
              </p>
              <p className={`text-xs ${favorColor}`}>
                {favorLabel}
                {row.contributionPct !== 0 && (
                  <>
                    {locale === "en" ? " · contribution " : " · 예측 기여 "}
                    {row.contributionPct > 0 ? "+" : ""}
                    {row.contributionPct}
                    {locale === "en" ? "pp" : "%p"}
                  </>
                )}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
