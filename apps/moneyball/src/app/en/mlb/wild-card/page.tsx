import type { Metadata } from "next";
import Link from "next/link";
import {
  MLB_TEAMS,
  MLB_TEAM_COUNT,
  MLB_DIVISION_COUNT,
  MLB_GAMES_PER_TEAM,
  MLB_WILDCARD_COUNT,
  type MlbLeagueSide, SITE_URL
} from "@moneyball/shared";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { MlbTeamLogo } from "@/components/shared/MlbTeamLogo";
import { buildMlbDivisionStandings, buildMlbWildcardStandings, type MlbWildcardRow } from "@/lib/mlb/buildMlbStandings";
import { computeMagicNumber } from "@/lib/standings/computeMagicNumber";

const FACTOR_TOTAL = MLB_FACTOR_COUNTS.total;

export const revalidate = 21600; // MLB_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export const metadata: Metadata = {
  title: "MLB Wild Card Race — AL/NL Wild Card Contenders | MoneyBall Score",
  description:
    `MLB AL/NL Wild Card race — ${MLB_WILDCARD_COUNT} spots per league, live standings + game-back + Magic Number. ${MLB_FACTOR_COUNTS.total}-factor model base.`,
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
      `MLB AL/NL Wild Card ${MLB_WILDCARD_COUNT}-spot race — live standings + ${FACTOR_TOTAL}-factor model base.`,
    url: `${SITE_URL}/en/mlb/wild-card`,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB Wild Card Race | MoneyBall Score",
    description:
      `MLB AL/NL Wild Card ${MLB_WILDCARD_COUNT}-spot race — live standings + ${FACTOR_TOTAL}-factor model base.`,
  },
};

const LEAGUES: MlbLeagueSide[] = ["AL", "NL"];

function leagueName(league: MlbLeagueSide) {
  return league === "AL" ? "American League" : "National League";
}

function formatWinPct(v: number): string {
  if (v === 0) return "-.---";
  return v.toFixed(3).replace(/^0/, "");
}

function formatWcGB(gb: number | null): string {
  if (gb === null || gb === 0) return "-";
  const abs = Math.abs(gb);
  const formatted = abs % 1 === 0 ? `${abs}.0` : String(abs);
  return gb < 0 ? `+${formatted}` : formatted;
}

function WcMagicNumberBadge({ value }: { value: number }) {
  return (
    <p className="text-xs font-semibold tabular-nums text-brand-600 dark:text-brand-400">
      {value === 0 ? "Wild Card berth clinched" : `Wild Card Magic Number ${value}`}
    </p>
  );
}

export default async function MlbWildCardHubEn() {
  const divisionStandings = await buildMlbDivisionStandings();
  const wildcardStandings = buildMlbWildcardStandings(divisionStandings);

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
          AL/NL both leagues — Wild Card {MLB_WILDCARD_COUNT}-spot race. Of the teams outside the {MLB_DIVISION_COUNT} division leaders, the top {MLB_WILDCARD_COUNT} by win rate per league advance.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Live standings based on final games · game-back · Magic Number + {FACTOR_TOTAL}-factor model base.
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
          <li>MLB {MLB_GAMES_PER_TEAM}-game full ingestion + {MLB_FACTOR_COUNTS.total}-factor model — <strong>Complete</strong></li>
          <li>{MLB_TEAM_COUNT}-team standings (AL/NL × E/C/W {MLB_DIVISION_COUNT} divisions) — <strong>Complete</strong> (<Link href="/en/mlb/standings" className="underline">/en/mlb/standings</Link>)</li>
          <li>Wild Card {MLB_WILDCARD_COUNT}-spot race standings + game-back + Magic Number — <strong>Complete</strong></li>
          <li>Postseason bracket (WC / DS / LCS / WS) visualization — <strong>ETA 2026-09</strong></li>
        </ul>
      </section>

      <section className="space-y-5" aria-labelledby="wc-race-heading">
        <h2
          id="wc-race-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          Wild Card Race — Teams Outside {MLB_DIVISION_COUNT} Division Leaders
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          3 division leaders per league advance automatically. Among the rest, top {MLB_WILDCARD_COUNT} by win rate = Wild Card berths. GB = relative to the cutoff ({MLB_WILDCARD_COUNT}th place) team (+ = cushion, plain number = games to catch up).
        </p>
        {LEAGUES.map((league) => {
          const rows: MlbWildcardRow[] = wildcardStandings[league];
          const cutoff = rows[MLB_WILDCARD_COUNT - 1];
          const firstOut = rows[MLB_WILDCARD_COUNT];
          const wcMagicNumber =
            cutoff && firstOut ? computeMagicNumber(cutoff, firstOut, MLB_GAMES_PER_TEAM) : null;
          return (
            <div key={league} className="space-y-3" aria-labelledby={`wc-${league}-heading`}>
              <h3
                id={`wc-${league}-heading`}
                className="text-sm font-semibold text-gray-600 dark:text-gray-300"
              >
                {leagueName(league)}
              </h3>
              <ol className="space-y-2">
                {rows.map((row, idx) => {
                  const team = MLB_TEAMS[row.teamCode];
                  const inField = idx < MLB_WILDCARD_COUNT;
                  const showMagicNumber =
                    idx === MLB_WILDCARD_COUNT - 1 && wcMagicNumber !== null;
                  return (
                    <li key={row.teamCode}>
                      <Link
                        href={`/en/mlb/team/${row.teamCode}`}
                        className={
                          "flex items-center gap-3 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border p-3 hover:shadow-md transition-all " +
                          (inField
                            ? "border-amber-300 dark:border-amber-700 hover:border-amber-500/70"
                            : "border-gray-200 dark:border-[var(--color-border)] hover:border-amber-500/50")
                        }
                      >
                        <span
                          aria-hidden
                          className={
                            "inline-flex items-center justify-center w-9 h-7 text-xs font-bold rounded-full shrink-0 " +
                            (inField
                              ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                              : "bg-gray-100 dark:bg-[var(--color-surface-hover)] text-gray-500 dark:text-gray-400")
                          }
                        >
                          {inField ? `WC${idx + 1}` : idx + 1}
                        </span>
                        <MlbTeamLogo team={row.teamCode} size={24} className="rounded-full shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{team.shortName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono tabular-nums">
                            {row.wins}-{row.losses} · {formatWinPct(row.winPct)} · GB {formatWcGB(row.wcGamesBehind)}
                          </p>
                          {showMagicNumber && wcMagicNumber !== null && (
                            <WcMagicNumberBadge value={wcMagicNumber} />
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </section>

      <footer className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[var(--color-border)] pt-4 space-y-1">
        <p>
          ※ This hub started as a Header NAV broken-link recovery layer — extended to a live Wild Card race using final mlb_schedule game results (cycle 2305).
        </p>
        <p>
          ※ Related: <Link href="/en/mlb/standings" className="underline">/en/mlb/standings</Link> · <Link href="/en/mlb/postseason" className="underline">/en/mlb/postseason</Link> · <Link href="/en/mlb" className="underline">/en/mlb</Link> hub.
        </p>
      </footer>
    </main>
  );
}
