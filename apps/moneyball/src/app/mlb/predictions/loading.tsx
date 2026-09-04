export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <div>
        <div className="h-8 w-40 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-2" />
        <div className="h-4 w-64 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl animate-pulse bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
    </div>
  );
}
