import {
  computeWinRatePct,
  computeWinRateColorClass,
} from "@/lib/analysis/convergenceRecord";

type HomeAwaySplit = {
  home: { wins: number; losses: number };
  away: { wins: number; losses: number };
};

// cycle 1993: reviews 허브(wave-596/597) + monthly(wave-600) + weekly(wave-601) 3곳에
// 동일 정의가 중복되던 홈/어웨이 지목 성적 배지 통합 (ConvergenceTeamStatsBadges cycle 1992 동일 패턴 — silent drift family).
export function ConvergenceHomeAwayBadges({
  titleId,
  strongSplit,
  completeSplit,
}: {
  titleId: string;
  strongSplit: HomeAwaySplit | null;
  completeSplit: HomeAwaySplit | null;
}) {
  if (strongSplit === null && completeSplit === null) return null;

  return (
    <section aria-labelledby={titleId} className="space-y-2">
      <h2 id={titleId} className="text-lg font-bold">
        홈/어웨이 지목 성적
      </h2>
      {strongSplit !== null && (() => {
        const homeTotal = strongSplit.home.wins + strongSplit.home.losses;
        const awayTotal = strongSplit.away.wins + strongSplit.away.losses;
        const homePct = computeWinRatePct(strongSplit.home.wins, homeTotal);
        const awayPct = computeWinRatePct(strongSplit.away.wins, awayTotal);
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">🏅 강수렴:</span>
            <span
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60"
              title={`홈팀 지목 ${homeTotal}경기: ${strongSplit.home.wins}승 ${strongSplit.home.losses}패 (${homePct}%)`}
            >
              <span className="text-gray-500 dark:text-gray-400">🏠홈</span>
              <span className={`tabular-nums font-medium ${computeWinRateColorClass(homePct)}`}>{homePct}%</span>
              <span className="text-gray-400 dark:text-gray-500 tabular-nums">({homeTotal})</span>
            </span>
            <span
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60"
              title={`어웨이팀 지목 ${awayTotal}경기: ${strongSplit.away.wins}승 ${strongSplit.away.losses}패 (${awayPct}%)`}
            >
              <span className="text-gray-500 dark:text-gray-400">✈️원정</span>
              <span className={`tabular-nums font-medium ${computeWinRateColorClass(awayPct)}`}>{awayPct}%</span>
              <span className="text-gray-400 dark:text-gray-500 tabular-nums">({awayTotal})</span>
            </span>
          </div>
        );
      })()}
      {completeSplit !== null && (() => {
        const homeTotal = completeSplit.home.wins + completeSplit.home.losses;
        const awayTotal = completeSplit.away.wins + completeSplit.away.losses;
        const homePct = computeWinRatePct(completeSplit.home.wins, homeTotal);
        const awayPct = computeWinRatePct(completeSplit.away.wins, awayTotal);
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">★ 완전수렴:</span>
            <span
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20"
              title={`홈팀 지목 ${homeTotal}경기: ${completeSplit.home.wins}승 ${completeSplit.home.losses}패 (${homePct}%)`}
            >
              <span className="text-amber-600 dark:text-amber-400">🏠홈</span>
              <span className={`tabular-nums font-medium ${computeWinRateColorClass(homePct)}`}>{homePct}%</span>
              <span className="text-gray-400 dark:text-gray-500 tabular-nums">({homeTotal})</span>
            </span>
            <span
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20"
              title={`어웨이팀 지목 ${awayTotal}경기: ${completeSplit.away.wins}승 ${completeSplit.away.losses}패 (${awayPct}%)`}
            >
              <span className="text-amber-600 dark:text-amber-400">✈️원정</span>
              <span className={`tabular-nums font-medium ${computeWinRateColorClass(awayPct)}`}>{awayPct}%</span>
              <span className="text-gray-400 dark:text-gray-500 tabular-nums">({awayTotal})</span>
            </span>
          </div>
        );
      })()}
    </section>
  );
}
