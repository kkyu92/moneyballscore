import { getAccuracyColor } from "@moneyball/shared";

interface AccuracySummaryProps {
  total: number;
  correct: number;
  rate: number;
  highConfRate?: number;
}

export function AccuracySummary({
  total,
  correct,
  rate,
  highConfRate,
}: AccuracySummaryProps) {
  const ratePct = Math.round(rate * 100);

  return (
    <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">시즌 적중률</h3>
      <div className="flex items-end gap-2 mb-4">
        <span
          className={`text-4xl font-bold ${getAccuracyColor(ratePct)}`}
        >
          {ratePct}%
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          ({correct}/{total})
        </span>
      </div>
      {/* 바 차트 */}
      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-3">
        <div
          className="bg-brand-500 h-2 rounded-full transition-all"
          style={{ width: `${ratePct}%` }}
        />
      </div>
      {highConfRate != null && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          고확신 예측 적중률:{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {Math.round(highConfRate * 100)}%
          </span>
        </p>
      )}
    </div>
  );
}
