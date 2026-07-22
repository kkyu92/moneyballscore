import { WEEKDAY_LABELS_KO } from "@moneyball/shared";
import {
  computeWinRatePct,
  computeWinRateColorClass,
} from "@/lib/analysis/convergenceRecord";

type DayStat = { dayIndex: number; wins: number; losses: number };

// cycle 1993: reviews 허브(wave-599) + monthly(wave-602) 2곳에 동일 정의가 중복되던
// 요일별 수렴 픽 성적 배지 통합 (weekly 는 표본 구조적 미달로 미도입 — 기존 동일).
export function ConvergenceDayOfWeekBadges({
  titleId,
  strongSplit,
  completeSplit,
}: {
  titleId: string;
  strongSplit: DayStat[];
  completeSplit: DayStat[];
}) {
  if (strongSplit.length === 0 && completeSplit.length === 0) return null;

  return (
    <section aria-labelledby={titleId} className="space-y-2">
      <h2 id={titleId} className="text-lg font-bold">
        요일별 수렴 픽 성적
      </h2>
      {strongSplit.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">🏅 강수렴:</span>
          {strongSplit.map(stat => {
            const dayTotal = stat.wins + stat.losses;
            const pct = computeWinRatePct(stat.wins, dayTotal);
            return (
              <span
                key={`strong-day-${stat.dayIndex}`}
                className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60"
                title={`${WEEKDAY_LABELS_KO[stat.dayIndex]}요일: ${stat.wins}승 ${stat.losses}패 (${pct}%) — 강수렴 픽 ${dayTotal}경기`}
              >
                <span className="font-medium text-gray-700 dark:text-gray-300">{WEEKDAY_LABELS_KO[stat.dayIndex]}</span>
                <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>{pct}%</span>
              </span>
            );
          })}
        </div>
      )}
      {completeSplit.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">★ 완전수렴:</span>
          {completeSplit.map(stat => {
            const dayTotal = stat.wins + stat.losses;
            const pct = computeWinRatePct(stat.wins, dayTotal);
            return (
              <span
                key={`complete-day-${stat.dayIndex}`}
                className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20"
                title={`${WEEKDAY_LABELS_KO[stat.dayIndex]}요일: ${stat.wins}승 ${stat.losses}패 (${pct}%) — 완전수렴 픽 ${dayTotal}경기`}
              >
                <span className="font-medium text-amber-700 dark:text-amber-300">{WEEKDAY_LABELS_KO[stat.dayIndex]}</span>
                <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>{pct}%</span>
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
