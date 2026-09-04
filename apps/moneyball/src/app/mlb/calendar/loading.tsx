export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <div>
        <div className="h-8 w-40 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mb-2" />
        <div className="h-4 w-64 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg animate-pulse bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
    </div>
  );
}
