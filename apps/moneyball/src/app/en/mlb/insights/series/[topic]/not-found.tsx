import Link from "next/link";
import type { Metadata } from "next";
import { MLB_TEAM_COUNT } from "@moneyball/shared";

export const metadata: Metadata = {
  title: "MLB AI Insights Series Not Found",
  description: "The requested MLB AI insights series for this team pair does not exist or the URL format is invalid.",
  robots: { index: false, follow: false },
};

export default function MlbSeriesTopicNotFoundEn() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">Insights Series Not Found</h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          The requested team pair is invalid or the URL format is incorrect.
          <br className="hidden sm:block" />
          Both team codes must be in alphabetical order.
        </p>
      </header>

      <section className="bg-gray-50 dark:bg-[var(--color-surface-card)]/50 rounded-xl p-5 text-left text-sm text-gray-600 dark:text-gray-300 space-y-2">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">URL format</h2>
        <ul className="space-y-1 text-xs font-mono text-gray-500 dark:text-gray-400">
          <li>· Series — <code>/en/mlb/insights/series/bos-vs-nyy</code> (2 team codes, alphabetical order, lowercase)</li>
          <li>· MLB {MLB_TEAM_COUNT} team codes — see the hub below</li>
        </ul>
      </section>

      <div className="pt-2 flex justify-center gap-3 text-sm">
        <Link href="/en/mlb/insights" className="text-brand-600 dark:text-brand-400 hover:underline">
          MLB AI Insights hub →
        </Link>
        <Link href="/en/mlb/team" className="text-gray-600 dark:text-gray-300 hover:underline">
          MLB team list →
        </Link>
      </div>
    </div>
  );
}
