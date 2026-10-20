import Link from "next/link";
import type { Metadata } from "next";
import { toKSTDateString, kstDateOffset } from "@moneyball/shared";

export const metadata: Metadata = {
  title: "MLB AI Insights Not Found",
  description: "No MLB AI insights exist for the requested date, or the date format is invalid.",
  robots: { index: false, follow: false },
};

export default function EnMlbInsightsDateNotFound() {
  const today = toKSTDateString();
  const recentDates = [0, 1, 2, 3, 4, 5, 6].map((d) => kstDateOffset(d));

  return (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">No MLB AI Insights for This Date</h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          No AI judge reasoning has accumulated for the requested date, or the format is invalid.
          <br className="hidden sm:block" />
          Check recent dates below.
        </p>
      </header>

      <nav aria-label="Recent dates" className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Recent MLB Insights</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {recentDates.map((date, i) => {
            const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : date;
            return (
              <li key={date}>
                <Link
                  href={`/en/mlb/insights/${date}`}
                  className="block bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="bg-gray-50 dark:bg-[var(--color-surface-card)]/50 rounded-xl p-5 text-left text-sm text-gray-600 dark:text-gray-300 space-y-2">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">URL format</h2>
        <ul className="space-y-1 text-xs font-mono text-gray-500 dark:text-gray-400">
          <li>· Daily MLB insights — <code>/en/mlb/insights/{today}</code></li>
          <li>· Date format — <code>YYYY-MM-DD</code> (KST, last 90 days)</li>
        </ul>
      </section>

      <div className="pt-2 flex justify-center gap-3 text-sm">
        <Link href="/en/mlb/insights" className="text-brand-600 dark:text-brand-400 hover:underline">
          MLB AI Insights hub →
        </Link>
        <Link href="/en/mlb" className="text-gray-600 dark:text-gray-300 hover:underline">
          Today&apos;s MLB predictions →
        </Link>
      </div>
    </div>
  );
}
