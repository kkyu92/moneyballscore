export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <div className="h-8 w-56 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="h-32 rounded-xl animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl animate-pulse bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl animate-pulse bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
    </div>
  );
}
