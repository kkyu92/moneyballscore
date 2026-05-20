export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <div className="h-8 w-40 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-2" />
        <div className="h-4 w-72 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="mb-6">
        <div className="h-6 w-28 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-3" />
        <div className="mb-3 flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-7 w-20 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
                <div className="h-5 w-14 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-3 w-3/4 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="h-6 w-28 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-3" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4"
            >
              <div className="h-4 w-40 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-2" />
              <div className="h-3 w-2/3 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
