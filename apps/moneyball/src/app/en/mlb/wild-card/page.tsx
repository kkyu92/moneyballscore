import type { Metadata } from "next";
import Link from "next/link";
import {
  MLB_TEAMS,
  MLB_DIVISIONS,
  MLB_TEAM_COUNT,
  MLB_DIVISION_COUNT,
  type MlbTeamCode,
  type MlbLeagueSide, SITE_URL
} from "@moneyball/shared";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export const revalidate = 21600; // MLB_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export const metadata: Metadata = {
  title: "MLB Wild Card Race — AL/NL Wild Card Contenders | MoneyBall Score",
  description:
    `MLB AL/NL Wild Card race — 3 spots per league. Late-season game-back tracking + ${MLB_FACTOR_COUNTS.total}-factor model base. Live data integration ETA 2026-08.`,
  alternates: {
    canonical: `${SITE_URL}/en/mlb/wild-card`,
    languages: {
      en: `${SITE_URL}/en/mlb/wild-card`,
      ko: `${SITE_URL}/mlb/wild-card`,
    },
  },
  openGraph: {
    title: "MLB Wild Card Race | MoneyBall Score",
    description:
      `MLB AL/NL Wild Card 3-spot race + ${MLB_FACTOR_COUNTS.total}-factor model base — Live data ETA 2026-08.`,
    url: `${SITE_URL}/en/mlb/wild-card`,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB Wild Card Race | MoneyBall Score",
    description:
      `MLB AL/NL Wild Card 3-spot race + ${MLB_FACTOR_COUNTS.total}-factor model base — Live data ETA 2026-08.`,
  },
};

const LEAGUES: MlbLeagueSide[] = ["AL", "NL"];

function leagueName(league: MlbLeagueSide) {
  return league === "AL" ? "American League" : "National League";
}

function leagueAllCodes(league: MlbLeagueSide): MlbTeamCode[] {
  return [
    ...MLB_DIVISIONS[league].East,
    ...MLB_DIVISIONS[league].Central,
    ...MLB_DIVISIONS[league].West,
  ];
}

export default function MlbWildCardHubEn() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <Breadcrumb
        items={[
          { href: "/en/mlb", label: "MLB Analysis" },
          { label: "Wild Card Race" },
        ]}
        locale="en"
      />

      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-amber-700 dark:text-amber-200">
          ⭐ MLB Wild Card Race
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          AL/NL both leagues — Wild Card 3-spot race. Of the remaining {MLB_TEAM_COUNT - MLB_DIVISION_COUNT} teams outside the {MLB_DIVISION_COUNT} division leaders, 3 per league advance.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ETA 2026-08 — Late-season game-back / Magic Number tracking + {MLB_FACTOR_COUNTS.total}-factor model live data integration.
        </p>
      </header>

      <section
        className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-5 space-y-2"
        aria-labelledby="wc-status-heading"
      >
        <h2
          id="wc-status-heading"
          className="text-base font-bold text-amber-800 dark:text-amber-200"
        >
          Progress Status
        </h2>
        <ul className="text-sm text-amber-900 dark:text-amber-100 space-y-1 list-disc list-inside">
          <li>MLB 162-game full ingestion + {MLB_FACTOR_COUNTS.total}-factor model — <strong>Complete</strong></li>
          <li>{MLB_TEAM_COUNT}-team standings (AL/NL × E/C/W {MLB_DIVISION_COUNT} divisions) — <strong>Complete</strong> (<Link href="/en/mlb/standings" className="underline">/en/mlb/standings</Link>)</li>
          <li>Wild Card 3-spot race tracking + live game-back — <strong>ETA 2026-08</strong></li>
          <li>Postseason bracket (WC / DS / LCS / WS) visualization — <strong>ETA 2026-09</strong></li>
        </ul>
      </section>

      <section className="space-y-4" aria-labelledby="wc-pool-heading">
        <h2
          id="wc-pool-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          Wild Card Candidate Pool — Teams Outside Division Leaders
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          3 division leaders per league = automatic playoff berths. Top 3 by win rate among the remaining {MLB_TEAM_COUNT / 2 - 3} = Wild Card spots. This hub shows all {MLB_TEAM_COUNT} team entry paths — live game-back data activates at ETA.
        </p>
        {LEAGUES.map((league) => {
          const codes = leagueAllCodes(league);
          return (
            <div key={league} className="space-y-2" aria-labelledby={`wc-${league}-heading`}>
              <h3
                id={`wc-${league}-heading`}
                className="text-base font-semibold text-gray-600 dark:text-gray-300"
              >
                {leagueName(league)} ({codes.length} teams)
              </h3>
              <ul className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {codes.map((code) => {
                  const team = MLB_TEAMS[code];
                  return (
                    <li key={code}>
                      <Link
                        href={`/en/mlb/team/${code}`}
                        className="flex items-center gap-2 bg-white dark:bg-[var(--color-surface-card)] rounded-lg border border-gray-200 dark:border-[var(--color-border)] p-2 hover:shadow-md hover:border-amber-500/50 transition-all"
                      >
                        <span
                          className="inline-block w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: team.color }}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{team.shortName}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                            {team.division}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>

      <footer className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[var(--color-border)] pt-4 space-y-1">
        <p>
          ※ This hub = broken NAV link recovery layer (cycle 1029). Live Wild Card race data integration = ETA 2026-08 (late regular season game-back tracking activates).
        </p>
        <p>
          ※ Related: <Link href="/en/mlb/standings" className="underline">/en/mlb/standings</Link> · <Link href="/en/mlb/postseason" className="underline">/en/mlb/postseason</Link> · <Link href="/en/mlb" className="underline">/en/mlb</Link> hub.
        </p>
      </footer>
    </main>
  );
}
