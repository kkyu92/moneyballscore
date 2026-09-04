export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <div>
        <div className="h-8 w-40 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-2" />
        <div className="h-4 w-72 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4"
          >
            <div className="h-4 w-16 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-2" />
            <div className="h-7 w-12 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      <div className="h-64 rounded-xl animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="rounded-xl border border-gray-200 dark:border-[var(--color-border)] overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[var(--color-border)] last:border-b-0"
          >
            <div className="h-5 w-40 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
            <div className="h-5 w-16 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
