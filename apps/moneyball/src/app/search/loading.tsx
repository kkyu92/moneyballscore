export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      <div className="h-4 w-12 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-3">
        <div className="h-8 w-20 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-72 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="h-11 rounded-lg animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
        <div className="h-5 w-24 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center justify-between py-3">
              <div className="h-4 w-40 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-16 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
