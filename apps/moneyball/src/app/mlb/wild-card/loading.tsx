export default function Loading() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <div className="h-4 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-2">
        <div className="h-9 w-64 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-full max-w-md rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
      </div>

      {Array.from({ length: 2 }).map((_, league) => (
        <div key={league} className="space-y-3">
          <div className="h-6 w-40 rounded animate-pulse bg-gray-200 dark:bg-gray-700 border-b border-gray-200 dark:border-[var(--color-border)] pb-2" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3"
              >
                <div className="w-7 h-7 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div className="w-6 h-6 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="h-4 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-40 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="h-5 w-20 rounded animate-pulse bg-gray-200 dark:bg-gray-700 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
