import {
  CURRENT_SCORING_RULE,
  DEFAULT_WEIGHTS,
  KBO_TEAMS,
  josa,
  shortTeamName,
  type TeamCode,
} from '@moneyball/shared';
import {
  explainFactor,
  type FactorRawDetails,
} from "@/lib/analysis/factor-explanations";

interface DetailedFactorAnalysisProps {
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  factors: Record<string, number>;
  details: FactorRawDetails;
}

/**
 * /analysis/game/[id] 전용 확장 팩터 해설 섹션.
 * 가중치 내림차순으로 정렬된 10팩터 각각에:
 *   - 원정/홈 수치
 *   - 우위 표시
 *   - 한국어 1-2줄 해설
 *   - 예측 기여도 %p
 * 를 제공하여 경기당 약 600-1000자 SEO 본문 추가.
 */
export function DetailedFactorAnalysis({
  homeTeam,
  awayTeam,
  factors,
  details,
}: DetailedFactorAnalysisProps) {
  const homeName = shortTeamName(homeTeam);
  const awayName = shortTeamName(awayTeam);

  const rows = Object.entries(factors)
    .filter(([key]) => key in DEFAULT_WEIGHTS)
    .sort(([a], [b]) => {
      const wa = DEFAULT_WEIGHTS[a as keyof typeof DEFAULT_WEIGHTS] ?? 0;
      const wb = DEFAULT_WEIGHTS[b as keyof typeof DEFAULT_WEIGHTS] ?? 0;
      return wb - wa;
    })
    .map(([key, value]) =>
      explainFactor({
        key,
        factorValue: value,
        details,
        homeTeamName: homeName,
        awayTeamName: awayName,
      })
    );

  const topFactor = rows[0];

  return (
    <section
      aria-labelledby="factor-analysis-title"
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-4"
    >
      <header className="space-y-1">
        <h2
          id="factor-analysis-title"
          className="text-lg font-bold flex items-center gap-2"
        >
          📊 팩터별 정량 해설
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          정량 모델 {CURRENT_SCORING_RULE}의 10개 팩터를 가중치 순으로 분석합니다.
          {topFactor?.favorTeam && (
            <>
              {" "}
              가장 영향력 큰 팩터는 <strong>{topFactor.label}</strong>
              으로, {topFactor.favorTeam}{josa(topFactor.favorTeam, "이", "가")} 예측 승률에 {
                topFactor.contributionPct > 0 ? "+" : ""
              }
              {topFactor.contributionPct}%p 기여합니다.
            </>
          )}
        </p>
      </header>

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
              ? `${homeName} 우위`
              : row.favor === "away"
                ? `${awayName} 우위`
                : "비슷";

          return (
            <article
              key={row.key}
              className="border-l-4 pl-4 py-2 space-y-1"
              style={{
                borderColor:
                  row.favor === "home"
                    ? KBO_TEAMS[homeTeam].color
                    : row.favor === "away"
                      ? KBO_TEAMS[awayTeam].color
                      : "var(--color-factor-neutral)",
              }}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                    {row.label}
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    가중치 {row.weightPct}%
                  </span>
                </div>
                <div className="text-xs font-mono text-gray-600 dark:text-gray-300">
                  {awayName} {row.awayValueLabel}
                  <span className="mx-1 text-gray-400 dark:text-gray-500">vs</span>
                  {homeName} {row.homeValueLabel}
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                {row.narrative || `${row.label} 데이터 부족.`}
              </p>
              <p className={`text-xs ${favorColor}`}>
                {favorLabel}
                {row.contributionPct !== 0 && (
                  <>
                    {" · 예측 기여 "}
                    {row.contributionPct > 0 ? "+" : ""}
                    {row.contributionPct}%p
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
