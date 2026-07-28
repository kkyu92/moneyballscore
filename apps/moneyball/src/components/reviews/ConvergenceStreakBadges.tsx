type Streak = { type: 'win' | 'loss'; length: number } | null;

// wave-606: monthly(wave-594) 리뷰 상세 페이지에 인라인으로만 존재하던 수렴 픽 스트리크 카드를
// ConvergenceHomeAwayBadges/ConvergenceTeamStatsBadges (cycle 1992/1993) 와 동일 패턴으로 추출 —
// /seasons/[year] 에 없던 gap (getConvergencePickStreak/getConvergencePickBestStreak 미사용) 채우기 위함.
export function ConvergenceStreakBadges({
  titleId,
  strongStreak,
  strongBestStreak,
  completeStreak,
  completeBestStreak,
}: {
  titleId: string;
  strongStreak: Streak;
  strongBestStreak: Streak;
  completeStreak: Streak;
  completeBestStreak: Streak;
}) {
  if (strongStreak === null && completeStreak === null) return null;

  return (
    <section aria-labelledby={titleId} className="space-y-3">
      <h2 id={titleId} className="text-xl font-bold">
        수렴 픽 스트리크
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {strongStreak !== null && (
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-brand-500/30 p-5">
            <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide">강수렴 픽</p>
            <p className={`text-2xl font-bold mt-1 ${strongStreak.type === 'win' ? 'text-amber-500 dark:text-amber-400' : 'text-sky-500 dark:text-sky-400'}`}>
              {strongStreak.type === 'win' ? '🔥' : '❄️'}{' '}
              {strongStreak.length}연{strongStreak.type === 'win' ? '승' : '패'}
            </p>
            {strongBestStreak !== null && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                최장 {strongBestStreak.length}연{strongBestStreak.type === 'win' ? '승' : '패'}
              </p>
            )}
          </div>
        )}
        {completeStreak !== null && (
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-amber-500/30 p-5">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">★ 완전수렴 픽</p>
            <p className={`text-2xl font-bold mt-1 ${completeStreak.type === 'win' ? 'text-amber-600 dark:text-amber-400' : 'text-sky-500 dark:text-sky-400'}`}>
              {completeStreak.type === 'win' ? '🔥' : '❄️'}{' '}
              {completeStreak.length}연{completeStreak.type === 'win' ? '승' : '패'}
            </p>
            {completeBestStreak !== null && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                최장 {completeBestStreak.length}연{completeBestStreak.type === 'win' ? '승' : '패'}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
