export default function Loading() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="h-4 w-40 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="h-8 w-56 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="h-8 w-64 rounded-lg animate-pulse bg-gray-200 dark:bg-gray-700" />

      <ul className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="rounded-lg border border-brand-200 dark:border-brand-800 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-16 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
