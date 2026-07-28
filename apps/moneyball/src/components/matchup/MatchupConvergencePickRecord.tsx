import {
  computeWinRatePct,
  computeWinRateColorClass,
} from "@/lib/analysis/convergenceRecord";
import type { TeamCode } from "@moneyball/shared";

type TeamStat = { teamCode: TeamCode; wins: number; losses: number };

function findStat(stats: TeamStat[], code: TeamCode): TeamStat | undefined {
  return stats.find((s) => s.teamCode === code);
}

// wave-608: /matchup/[teamA]/[teamB] 두 팀 맞대결 한정 강수렴/완전수렴 픽 성적 —
// TeamConvergencePickRecord (wave-607, /teams/[code] 시즌 전체 기준) 와 동일 표시 패턴이나
// 대상이 "이 두 팀이 맞붙은 경기"로 한정된다는 점만 다름. 양 팀 모두 표본 없으면 렌더 skip.
export function MatchupConvergencePickRecord({
  titleId,
  teamA,
  teamB,
  strongStats,
  completeStats,
}: {
  titleId: string;
  teamA: { code: TeamCode; shortName: string };
  teamB: { code: TeamCode; shortName: string };
  strongStats: TeamStat[];
  completeStats: TeamStat[];
}) {
  const rows = [
    { team: teamA, strong: findStat(strongStats, teamA.code), complete: findStat(completeStats, teamA.code) },
    { team: teamB, strong: findStat(strongStats, teamB.code), complete: findStat(completeStats, teamB.code) },
  ].filter((r) => r.strong || r.complete);

  if (rows.length === 0) return null;

  return (
    <section
      aria-labelledby={titleId}
      className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
    >
      <h2 id={titleId} className="text-lg font-bold mb-3">
        수렴 픽 성적 (이 매치업 한정)
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        이 두 팀이 맞붙었을 때 모델의 강수렴(8팩터+) 또는 완전수렴(10팩터) 픽으로 지목된 팀의 실제 결과
      </p>
      <div className="space-y-2">
        {rows.map(({ team, strong, complete }) => (
          <div key={team.code} className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium w-16 shrink-0">{team.shortName}</span>
            {strong && (() => {
              const pct = computeWinRatePct(strong.wins, strong.wins + strong.losses);
              return (
                <span
                  className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded bg-gray-100 dark:bg-gray-800/60"
                  title={`강수렴 픽 ${strong.wins + strong.losses}경기`}
                >
                  <span className="text-gray-500 dark:text-gray-400">🏅 강수렴</span>
                  <span className="font-mono font-semibold">
                    {strong.wins}승 {strong.losses}패
                  </span>
                  <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>({pct}%)</span>
                </span>
              );
            })()}
            {complete && (() => {
              const pct = computeWinRatePct(complete.wins, complete.wins + complete.losses);
              return (
                <span
                  className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-900/20"
                  title={`완전수렴 픽 ${complete.wins + complete.losses}경기`}
                >
                  <span className="text-amber-700 dark:text-amber-300">★ 완전수렴</span>
                  <span className="font-mono font-semibold">
                    {complete.wins}승 {complete.losses}패
                  </span>
                  <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>({pct}%)</span>
                </span>
              );
            })()}
          </div>
        ))}
      </div>
    </section>
  );
}
