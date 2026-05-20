export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <div className="h-8 w-40 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-2" />
        <div className="h-4 w-72 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="mb-4 flex gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-24 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>

      <div className="mb-3 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-20 rounded-full animate-pulse bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-4 py-2 bg-gray-50 dark:bg-[var(--color-surface-card)]/60 border border-gray-100 dark:border-[var(--color-border)] rounded-lg">
          <div className="h-3 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-12 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] overflow-hidden">
          <div className="grid grid-cols-[2.5rem_1fr_3.5rem_5rem_4rem] text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-[var(--color-border)] px-4 py-2">
            <span>#</span>
            <span>닉네임</span>
            <span className="text-right">연속</span>
            <span className="text-right">적중률</span>
            <span className="text-right">픽 수</span>
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[2.5rem_1fr_3.5rem_5rem_4rem] px-4 py-2.5 items-center border-b last:border-b-0 border-gray-50 dark:border-[var(--color-border)] gap-2"
            >
              <div className="h-4 w-5 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-24 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-8 rounded animate-pulse bg-gray-200 dark:bg-gray-700 ml-auto" />
              <div className="h-4 w-12 rounded animate-pulse bg-gray-200 dark:bg-gray-700 ml-auto" />
              <div className="h-4 w-10 rounded animate-pulse bg-gray-200 dark:bg-gray-700 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
