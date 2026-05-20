export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <div className="h-8 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-2" />
        <div className="h-4 w-64 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 text-center"
          >
            <div className="h-3 w-16 mx-auto mb-2 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
            <div className="h-8 w-20 mx-auto rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-20 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>

      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-1">
                <div className="h-4 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-20 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
            <div className="h-6 w-14 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
