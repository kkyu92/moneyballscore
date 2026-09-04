export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700" />
        <div>
          <div className="h-6 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-2" />
          <div className="h-4 w-48 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4"
          >
            <div className="h-4 w-12 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-2" />
            <div className="h-6 w-10 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      <div className="h-48 rounded-xl animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-xl animate-pulse bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
    </div>
  );
}
