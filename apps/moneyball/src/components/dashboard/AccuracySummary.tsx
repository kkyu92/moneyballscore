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
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-4">시즌 적중률</h3>
      <div className="flex items-end gap-2 mb-4">
        <span
          className={`text-4xl font-bold ${
            ratePct >= 65
              ? "text-green-600"
              : ratePct >= 55
                ? "text-yellow-600"
                : "text-red-600"
          }`}
        >
          {ratePct}%
        </span>
        <span className="text-sm text-gray-500 mb-1">
          ({correct}/{total})
        </span>
      </div>
      {/* 바 차트 */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${ratePct}%` }}
        />
      </div>
      {highConfRate != null && (
        <p className="text-xs text-gray-500">
          고확신(70%+) 적중률:{" "}
          <span className="font-semibold text-gray-700">
            {Math.round(highConfRate * 100)}%
          </span>
        </p>
      )}
    </div>
  );
}
