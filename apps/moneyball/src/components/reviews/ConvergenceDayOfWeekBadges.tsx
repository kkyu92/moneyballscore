import { WEEKDAY_LABELS_KO, WEEKDAY_LABELS_EN } from "@moneyball/shared";
import {
  computeWinRatePct,
  computeWinRateColorClass,
} from "@/lib/analysis/convergenceRecord";

type DayStat = { dayIndex: number; wins: number; losses: number };

// cycle 1993: reviews 허브(wave-599) + monthly(wave-602) 2곳에 동일 정의가 중복되던
// 요일별 수렴 픽 성적 배지 통합 (weekly 는 표본 구조적 미달로 미도입 — 기존 동일).
// wave-659 (cycle 2339, en/mlb/reviews 미러): locale prop 추가 — 기본값 'ko' 라 기존 callsite 변경 없음.
export function ConvergenceDayOfWeekBadges({
  titleId,
  strongSplit,
  completeSplit,
  locale = 'ko',
}: {
  titleId: string;
  strongSplit: DayStat[];
  completeSplit: DayStat[];
  locale?: 'ko' | 'en';
}) {
  if (strongSplit.length === 0 && completeSplit.length === 0) return null;
  const isEn = locale === 'en';
  const labels = isEn ? WEEKDAY_LABELS_EN : WEEKDAY_LABELS_KO;
  const t = {
    title: isEn ? 'Convergence Pick Record by Day of Week' : '요일별 수렴 픽 성적',
    strong: isEn ? '🏅 Strong:' : '🏅 강수렴:',
    complete: isEn ? '★ Full:' : '★ 완전수렴:',
  };

  return (
    <section aria-labelledby={titleId} className="space-y-2">
      <h2 id={titleId} className="text-lg font-bold">
        {t.title}
      </h2>
      {strongSplit.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">{t.strong}</span>
          {strongSplit.map(stat => {
            const dayTotal = stat.wins + stat.losses;
            const pct = computeWinRatePct(stat.wins, dayTotal);
            return (
              <span
                key={`strong-day-${stat.dayIndex}`}
                className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60"
                title={
                  isEn
                    ? `${labels[stat.dayIndex]}: ${stat.wins}W ${stat.losses}L (${pct}%) — ${dayTotal} strong-convergence picks`
                    : `${labels[stat.dayIndex]}요일: ${stat.wins}승 ${stat.losses}패 (${pct}%) — 강수렴 픽 ${dayTotal}경기`
                }
              >
                <span className="font-medium text-gray-700 dark:text-gray-300">{labels[stat.dayIndex]}</span>
                <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>{pct}%</span>
              </span>
            );
          })}
        </div>
      )}
      {completeSplit.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">{t.complete}</span>
          {completeSplit.map(stat => {
            const dayTotal = stat.wins + stat.losses;
            const pct = computeWinRatePct(stat.wins, dayTotal);
            return (
              <span
                key={`complete-day-${stat.dayIndex}`}
                className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20"
                title={
                  isEn
                    ? `${labels[stat.dayIndex]}: ${stat.wins}W ${stat.losses}L (${pct}%) — ${dayTotal} full-convergence picks`
                    : `${labels[stat.dayIndex]}요일: ${stat.wins}승 ${stat.losses}패 (${pct}%) — 완전수렴 픽 ${dayTotal}경기`
                }
              >
                <span className="font-medium text-amber-700 dark:text-amber-300">{labels[stat.dayIndex]}</span>
                <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>{pct}%</span>
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
