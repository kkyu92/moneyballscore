interface Props {
  totalPredicted: number;
  totalVerified: number;
  totalCorrect: number;
}

export function AccuracyHeaderCard({
  totalPredicted,
  totalVerified,
  totalCorrect,
}: Props) {
  if (totalVerified === 0) return null;

  const accuracy = totalCorrect / totalVerified;
  const accuracyPct = Math.round(accuracy * 100);
  const colorClass =
    accuracy >= 0.6
      ? 'text-brand-600 dark:text-brand-400'
      : accuracy >= 0.5
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-600 dark:text-red-400';

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
      </div>
    </div>
  );
}
