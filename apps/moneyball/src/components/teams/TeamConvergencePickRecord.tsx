import {
  computeWinRatePct,
  computeWinRateColorClass,
} from "@/lib/analysis/convergenceRecord";

type TeamStat = { wins: number; losses: number } | undefined;

// wave-607: 팀 프로필 페이지에 강수렴/완전수렴 픽 성적이 없던 gap — analysis/seasons/reviews
// 허브·monthly·weekly 5곳엔 이미 팀별 분리 성적이 있었지만 /teams/[code] 만 빠져 있었음.
// 전체 팀 목록이 아닌 "이 팀이 모델의 수렴 픽 대상이었을 때" 단일 행만 표시 (소표본 팀은 상위
// getConvergencePickTeamStats 의 CONVERGENCE_TEAM_STATS_MIN_PICKS 게이팅으로 이미 걸러짐).
export function TeamConvergencePickRecord({
  titleId,
  strongStat,
  completeStat,
}: {
  titleId: string;
  strongStat: TeamStat;
  completeStat: TeamStat;
}) {
  if (!strongStat && !completeStat) return null;

  return (
    <section
      aria-labelledby={titleId}
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
    >
      <h2 id={titleId} className="text-lg font-bold mb-3">
        수렴 픽 성적
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        이 팀이 모델의 강수렴(8팩터+) 또는 완전수렴(10팩터) 픽으로 지목됐을 때의 실제 결과
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {strongStat && (
          <span
            className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded bg-gray-100 dark:bg-gray-800/60"
            title={`강수렴 픽 ${strongStat.wins + strongStat.losses}경기`}
          >
            <span className="text-gray-500 dark:text-gray-400">🏅 강수렴</span>
            <span className="font-mono font-semibold">
              {strongStat.wins}승 {strongStat.losses}패
            </span>
            <span
              className={`tabular-nums ${computeWinRateColorClass(
                computeWinRatePct(strongStat.wins, strongStat.wins + strongStat.losses),
              )}`}
            >
              ({computeWinRatePct(strongStat.wins, strongStat.wins + strongStat.losses)}%)
            </span>
          </span>
        )}
        {completeStat && (
          <span
            className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-900/20"
            title={`완전수렴 픽 ${completeStat.wins + completeStat.losses}경기`}
          >
            <span className="text-amber-700 dark:text-amber-300">★ 완전수렴</span>
            <span className="font-mono font-semibold">
              {completeStat.wins}승 {completeStat.losses}패
            </span>
            <span
              className={`tabular-nums ${computeWinRateColorClass(
                computeWinRatePct(completeStat.wins, completeStat.wins + completeStat.losses),
              )}`}
            >
              ({computeWinRatePct(completeStat.wins, completeStat.wins + completeStat.losses)}%)
            </span>
          </span>
        )}
      </div>
    </section>
  );
}
