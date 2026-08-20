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
// wave-659 (cycle 2339, en/mlb/reviews 미러): locale prop 추가 — 기본값 'ko' 라 기존 callsite 변경 없음.
export function ConvergenceHomeAwayBadges({
  titleId,
  strongSplit,
  completeSplit,
  locale = 'ko',
}: {
  titleId: string;
  strongSplit: HomeAwaySplit | null;
  completeSplit: HomeAwaySplit | null;
  locale?: 'ko' | 'en';
}) {
  if (strongSplit === null && completeSplit === null) return null;
  const isEn = locale === 'en';
  const t = {
    title: isEn ? 'Home/Away Pick Record' : '홈/어웨이 지목 성적',
    strong: isEn ? '🏅 Strong:' : '🏅 강수렴:',
    complete: isEn ? '★ Full:' : '★ 완전수렴:',
    home: isEn ? '🏠Home' : '🏠홈',
    away: isEn ? '✈️Away' : '✈️원정',
  };
  const homeTitle = (total: number, wins: number, losses: number, pct: number) =>
    isEn
      ? `Home pick ${total} games: ${wins}W ${losses}L (${pct}%)`
      : `홈팀 지목 ${total}경기: ${wins}승 ${losses}패 (${pct}%)`;
  const awayTitle = (total: number, wins: number, losses: number, pct: number) =>
    isEn
      ? `Away pick ${total} games: ${wins}W ${losses}L (${pct}%)`
      : `어웨이팀 지목 ${total}경기: ${wins}승 ${losses}패 (${pct}%)`;

  return (
    <section aria-labelledby={titleId} className="space-y-2">
      <h2 id={titleId} className="text-lg font-bold">
        {t.title}
      </h2>
      {strongSplit !== null && (() => {
        const homeTotal = strongSplit.home.wins + strongSplit.home.losses;
        const awayTotal = strongSplit.away.wins + strongSplit.away.losses;
        const homePct = computeWinRatePct(strongSplit.home.wins, homeTotal);
        const awayPct = computeWinRatePct(strongSplit.away.wins, awayTotal);
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">{t.strong}</span>
            <span
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60"
              title={homeTitle(homeTotal, strongSplit.home.wins, strongSplit.home.losses, homePct)}
            >
              <span className="text-gray-500 dark:text-gray-400">{t.home}</span>
              <span className={`tabular-nums font-medium ${computeWinRateColorClass(homePct)}`}>{homePct}%</span>
              <span className="text-gray-400 dark:text-gray-500 tabular-nums">({homeTotal})</span>
            </span>
            <span
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60"
              title={awayTitle(awayTotal, strongSplit.away.wins, strongSplit.away.losses, awayPct)}
            >
              <span className="text-gray-500 dark:text-gray-400">{t.away}</span>
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
            <span className="text-xs text-gray-500 dark:text-gray-400">{t.complete}</span>
            <span
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20"
              title={homeTitle(homeTotal, completeSplit.home.wins, completeSplit.home.losses, homePct)}
            >
              <span className="text-amber-600 dark:text-amber-400">{t.home}</span>
              <span className={`tabular-nums font-medium ${computeWinRateColorClass(homePct)}`}>{homePct}%</span>
              <span className="text-gray-400 dark:text-gray-500 tabular-nums">({homeTotal})</span>
            </span>
            <span
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20"
              title={awayTitle(awayTotal, completeSplit.away.wins, completeSplit.away.losses, awayPct)}
            >
              <span className="text-amber-600 dark:text-amber-400">{t.away}</span>
              <span className={`tabular-nums font-medium ${computeWinRateColorClass(awayPct)}`}>{awayPct}%</span>
              <span className="text-gray-400 dark:text-gray-500 tabular-nums">({awayTotal})</span>
            </span>
          </div>
        );
      })()}
    </section>
  );
}
