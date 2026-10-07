export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="h-4 w-24 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-3">
        <div className="h-9 w-48 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-full max-w-xl rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-40 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-28 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>

      <ol className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="rounded-xl border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-card)] p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-4 w-20 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-16 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-full rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-2/3 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
