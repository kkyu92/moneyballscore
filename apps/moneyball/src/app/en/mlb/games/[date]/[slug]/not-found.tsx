import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game Analysis Not Found",
  description: "No game exists for the requested date, or the slug format is invalid.",
  robots: { index: false, follow: false },
};

export default function MlbGameDetailNotFoundEn() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">Game Analysis Not Found</h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          No game exists for the requested date, or the URL format is invalid.
          <br className="hidden sm:block" />
          Check today&apos;s games below.
        </p>
      </header>

      <section className="bg-gray-50 dark:bg-[var(--color-surface-card)]/50 rounded-xl p-5 text-left text-sm text-gray-600 dark:text-gray-300 space-y-2">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200">URL format</h2>
        <ul className="space-y-1 text-xs font-mono text-gray-500 dark:text-gray-400">
          <li>· Game analysis — <code>/en/mlb/games/2026-10-20/nyy-vs-bos</code></li>
          <li>· Slug format — <code>&lt;home&gt;-vs-&lt;away&gt;</code> (team codes, lowercase)</li>
        </ul>
      </section>

      <div className="pt-2 flex justify-center gap-3 text-sm">
        <Link href="/en/mlb" className="text-brand-600 dark:text-brand-400 hover:underline">
          Today&apos;s MLB predictions →
        </Link>
        <Link href="/en/mlb/team" className="text-gray-600 dark:text-gray-300 hover:underline">
          MLB team list →
        </Link>
      </div>
    </div>
  );
}
