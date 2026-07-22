import {
  UPCOMING_CONVERGENCE_TEAM_LIMIT,
  shortTeamName,
  type TeamCode,
} from "@moneyball/shared";
import {
  computeWinRatePct,
  computeWinRateColorClass,
} from "@/lib/analysis/convergenceRecord";

type TeamStat = { teamCode: TeamCode; wins: number; losses: number };

// cycle 1992: reviews 허브(wave-596) + monthly(wave-603) + weekly(wave-603) 3곳에
// 동일 정의가 중복되던 팀별 수렴 픽 성적 배지 통합 (HighlightCard wave-598 동일 패턴 — silent drift family).
export function ConvergenceTeamStatsBadges({
  titleId,
  strongTeamStats,
  completeTeamStats,
}: {
  titleId: string;
  strongTeamStats: TeamStat[];
  completeTeamStats: TeamStat[];
}) {
  if (strongTeamStats.length === 0 && completeTeamStats.length === 0) return null;

  return (
    <section aria-labelledby={titleId} className="space-y-2">
      <h2 id={titleId} className="text-lg font-bold">
        팀별 수렴 픽 성적
      </h2>
      {strongTeamStats.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">🏅 강수렴:</span>
          {strongTeamStats.slice(0, UPCOMING_CONVERGENCE_TEAM_LIMIT).map((stat) => {
            const teamTotal = stat.wins + stat.losses;
            const pct = computeWinRatePct(stat.wins, teamTotal);
            return (
              <span
                key={`strong-${stat.teamCode}`}
                className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60"
                title={`${shortTeamName(stat.teamCode)}: ${stat.wins}승 ${stat.losses}패 (${pct}%) — 강수렴 픽 ${teamTotal}경기`}
              >
                <span className="font-medium text-gray-700 dark:text-gray-300">{shortTeamName(stat.teamCode)}</span>
                <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>{pct}%</span>
              </span>
            );
          })}
        </div>
      )}
      {completeTeamStats.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">★ 완전수렴:</span>
          {completeTeamStats.slice(0, UPCOMING_CONVERGENCE_TEAM_LIMIT).map((stat) => {
            const teamTotal = stat.wins + stat.losses;
            const pct = computeWinRatePct(stat.wins, teamTotal);
            return (
              <span
                key={`complete-${stat.teamCode}`}
                className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20"
                title={`${shortTeamName(stat.teamCode)}: ${stat.wins}승 ${stat.losses}패 (${pct}%) — 완전수렴 픽 ${teamTotal}경기`}
              >
                <span className="font-medium text-amber-700 dark:text-amber-300">{shortTeamName(stat.teamCode)}</span>
                <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>{pct}%</span>
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
