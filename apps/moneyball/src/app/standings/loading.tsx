export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-4 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="h-8 w-56 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="rounded-xl border border-gray-200 dark:border-[var(--color-border)] overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
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
