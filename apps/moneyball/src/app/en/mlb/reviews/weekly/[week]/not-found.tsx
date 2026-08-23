import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentWeek } from "@/lib/reviews/computeWeekRange";

export const metadata: Metadata = {
  title: "MLB Weekly Review Not Found",
  description: "The requested week is malformed or has no data.",
  robots: { index: false, follow: false },
};

function weekIdOffset(weeksAgo: number): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - weeksAgo * 7);
  return getCurrentWeek(now).weekId;
}

export default function MlbWeeklyReviewNotFoundEn() {
  const recentWeeks = [0, 1, 2, 3, 4, 5, 6, 7].map((w) => weekIdOffset(w));

  return (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">
          No MLB Weekly Review Found
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          The week you requested is malformed or outside the season.
          <br className="hidden sm:block" />
          Check a recent week below instead.
        </p>
      </header>

      <nav aria-label="Recent 8 weeks" className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          Recent 8 weeks
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {recentWeeks.map((weekId, i) => (
            <li key={weekId}>
              <Link
                href={`/en/mlb/reviews/weekly/${weekId}`}
                className="block bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {i === 0 ? "This week" : i === 1 ? "Last week" : weekId}
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
          <li>· Weekly review — <code>/en/mlb/reviews/weekly/{recentWeeks[0]}</code></li>
          <li>· Week format — <code>YYYY-Www</code> (ISO 8601, Monday start)</li>
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
