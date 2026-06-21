import { MIN_VERIFIED_GAMES_HEDGE } from '@moneyball/shared';

import { accuracyRateColorClass } from '@/lib/accuracy/buildAccuracyData';

interface Props {
  totalPredicted: number;
  totalVerified: number;
  totalCorrect: number;
  recentVerified?: number;
  recentCorrect?: number;
}

export function AccuracyHeaderCard({
  totalPredicted,
  totalVerified,
  totalCorrect,
  recentVerified,
  recentCorrect,
}: Props) {
  if (totalVerified === 0) return null;

  const accuracy = totalCorrect / totalVerified;
  const accuracyPct = Math.round(accuracy * 100);
  const colorClass = accuracyRateColorClass(accuracy);

  const showTrend =
    recentVerified !== undefined &&
    recentCorrect !== undefined &&
    recentVerified >= MIN_VERIFIED_GAMES_HEDGE &&
    totalVerified >= 30;
  const recentAccuracy = showTrend ? recentCorrect! / recentVerified! : 0;
  const deltaPp = showTrend
    ? Math.round((recentAccuracy - accuracy) * 100)
    : 0;
  const trendColorClass =
    deltaPp >= 3
      ? 'text-brand-600 dark:text-brand-400'
      : deltaPp <= -3
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-700 dark:text-gray-300';
  const trendSign = deltaPp > 0 ? '+' : '';

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            누적 적중률
          </div>
          <div className={`text-3xl font-bold ${colorClass}`}>
            {accuracyPct}
            <span className="text-xl">%</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            검증 완료
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {totalCorrect}
            <span className="text-base text-gray-500 dark:text-gray-400">
              /{totalVerified}
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            누적 예측
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {totalPredicted}
          </div>
        </div>
        {showTrend && (
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              최근 {recentVerified}건
            </div>
            <div
              className={`text-2xl font-bold ${trendColorClass}`}
              title={`최근 ${recentVerified}건 적중률 ${Math.round(recentAccuracy * 100)}%`}
            >
              {trendSign}
              {deltaPp}
              <span className="text-base text-gray-500 dark:text-gray-400">
                %p
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
