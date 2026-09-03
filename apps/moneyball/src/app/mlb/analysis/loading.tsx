export default function Loading() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      <div className="h-4 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div>
        <div className="h-8 w-56 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-2" />
        <div className="h-4 w-72 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* 오늘의 빅매치 카드 */}
      <div className="rounded-xl border border-brand-200 dark:border-brand-800 p-5">
        <div className="h-5 w-28 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-3" />
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-16 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>

      {/* 오늘 전체 예측 리스트 */}
      <div>
        <div className="h-6 w-40 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-3" />
        <ul className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="rounded-lg border border-brand-200 dark:border-brand-800 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-16 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 팀 전력 현황 그리드 */}
      <div>
        <div className="h-6 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg border border-brand-200 dark:border-brand-800 animate-pulse bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      </div>

      {/* 주간/월간 리뷰 + 적중 기록 CTA 카드 */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5"
          >
            <div className="h-4 w-48 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-2" />
            <div className="h-3 w-64 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </main>
  );
}
