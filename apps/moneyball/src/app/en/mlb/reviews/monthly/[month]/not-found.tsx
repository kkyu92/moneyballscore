import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentMonth } from "@/lib/reviews/computeMonthRange";

export const metadata: Metadata = {
  title: "MLB Monthly Review Not Found",
  description: "The requested month is malformed or has no data.",
  robots: { index: false, follow: false },
};

function monthIdOffset(monthsAgo: number): string {
  const now = new Date();
  now.setUTCMonth(now.getUTCMonth() - monthsAgo);
  return getCurrentMonth(now).monthId;
}

export default function MlbMonthlyReviewNotFoundEn() {
  const recentMonths = [0, 1, 2, 3, 4, 5].map((m) => monthIdOffset(m));

  return (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">
          No MLB Monthly Review Found
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          The month you requested is malformed or outside the season.
          <br className="hidden sm:block" />
          Check a recent month below instead.
        </p>
      </header>

      <nav aria-label="Recent 6 months" className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          Recent 6 months
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {recentMonths.map((monthId, i) => (
            <li key={monthId}>
              <Link
                href={`/en/mlb/reviews/monthly/${monthId}`}
                className="block bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {i === 0 ? "This month" : i === 1 ? "Last month" : monthId}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="bg-gray-50 dark:bg-[var(--color-surface-card)]/50 rounded-xl p-5 text-left text-sm text-gray-600 dark:text-gray-300 space-y-2">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">
          URL format
        </h2>
        <ul className="space-y-1 text-xs font-mono text-gray-500 dark:text-gray-400">
          <li>· Monthly review — <code>/en/mlb/reviews/monthly/{recentMonths[0]}</code></li>
          <li>· Month format — <code>YYYY-MM</code></li>
        </ul>
      </section>

      <div className="pt-2 flex justify-center gap-3 text-sm">
        <Link href="/en/mlb/reviews" className="text-brand-600 dark:text-brand-400 hover:underline">
          MLB Review hub →
        </Link>
        <Link href="/en/mlb" className="text-gray-600 dark:text-gray-300 hover:underline">
          Today&apos;s MLB predictions →
        </Link>
      </div>
    </div>
  );
}
