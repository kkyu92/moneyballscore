export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-4 w-32 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />

      <div className="h-28 rounded-2xl animate-pulse bg-gray-200 dark:bg-gray-700" />

      {Array.from({ length: 2 }).map((_, section) => (
        <div key={section} className="space-y-4">
          <div className="h-7 w-48 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
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
        </div>
      ))}
    </div>
  );
}
