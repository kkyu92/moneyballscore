import Link from "next/link";
import type { Metadata } from "next";
import { MLB_TEAMS, MLB_TEAM_COUNT, type MlbTeamCode, mlbShortTeamName } from "@moneyball/shared";

export const metadata: Metadata = {
  title: "MLB Team Not Found",
  description: `The requested team code does not exist among MLB's ${MLB_TEAM_COUNT} teams.`,
  robots: { index: false, follow: false },
};

const TEAM_CODES = Object.keys(MLB_TEAMS) as MlbTeamCode[];

export default function MlbTeamNotFoundEn() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-8">
      <header className="space-y-3">
        <p className="text-7xl font-bold font-mono text-brand-500/40">404</p>
        <h1 className="text-3xl md:text-4xl font-bold">MLB Team Not Found</h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          The requested team code does not exist among MLB&apos;s {MLB_TEAM_COUNT} teams.
          <br className="hidden sm:block" />
          Choose a team below.
        </p>
      </header>

      <nav aria-label={`MLB ${MLB_TEAM_COUNT} teams`} className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">MLB {MLB_TEAM_COUNT} Teams</h2>
        <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {TEAM_CODES.map((code) => (
            <li key={code}>
              <Link
                href={`/en/mlb/team/${code}`}
                className="block bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 text-sm font-medium rounded-lg px-3 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                {mlbShortTeamName(code)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="pt-2 flex justify-center gap-3 text-sm">
        <Link href="/en/mlb/team" className="text-brand-600 dark:text-brand-400 hover:underline">
          MLB team list hub →
        </Link>
        <Link href="/en/mlb" className="text-gray-600 dark:text-gray-300 hover:underline">
          Today&apos;s MLB predictions →
        </Link>
      </div>
    </div>
  );
}
