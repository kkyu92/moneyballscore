export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <div className="h-8 w-48 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-2" />
        <div className="h-4 w-72 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="mb-6 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-24 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
          <div className="h-6 w-16 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-12 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-16 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-20 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-16 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-14 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-1">
                  <div className="h-4 w-20 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-16 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
              <div className="h-4 w-6 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
              <div className="flex items-center gap-3">
                <div className="space-y-1 text-right">
                  <div className="h-4 w-20 rounded animate-pulse bg-gray-200 dark:bg-gray-700 ml-auto" />
                  <div className="h-3 w-16 rounded animate-pulse bg-gray-200 dark:bg-gray-700 ml-auto" />
                </div>
                <div className="w-10 h-10 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[var(--color-border)]">
              <div className="h-3 w-full rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-1.5" />
              <div className="h-3 w-3/4 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
