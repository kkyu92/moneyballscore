export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="h-4 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-3 border-b border-gray-200 dark:border-[var(--color-border)] pb-5">
        <div className="h-10 w-64 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="h-32 rounded-xl animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="h-48 rounded-xl animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="h-64 rounded-xl animate-pulse bg-gray-200 dark:bg-gray-700" />

      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="h-40 rounded-xl animate-pulse bg-gray-200 dark:bg-gray-700"
        />
      ))}
    </div>
  );
}
