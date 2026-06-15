import type { Metadata } from "next";
import Link from "next/link";
import {
  MLB_TEAMS,
  MLB_DIVISIONS,
  type MlbTeamCode,
  type MlbLeagueSide,
  type MlbDivisionSide,
} from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export const revalidate = 21600;

const SITE_URL = "https://moneyballscore.vercel.app";

export const metadata: Metadata = {
  title: "MLB Statcast 4 Factors — xwOBA · Barrel% · Hard Hit% · Launch Angle | MoneyBall Score",
  description:
    "MLB 14-factor model Statcast 4 layer (xwOBA · Barrel% · Hard Hit% · Launch Angle) explained + 30-team measurement status. Live team Statcast data integration ETA carry-over.",
  alternates: {
    canonical: `${SITE_URL}/en/mlb/players`,
    languages: {
      en: `${SITE_URL}/en/mlb/players`,
      ko: `${SITE_URL}/mlb/players`,
    },
  },
  openGraph: {
    title: "MLB Statcast 4 Factors | MoneyBall Score",
    description: "xwOBA · Barrel% · Hard Hit% · Launch Angle — MLB 14-factor Statcast 4.",
    url: `${SITE_URL}/en/mlb/players`,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB Statcast 4 Factors | MoneyBall Score",
    description: "xwOBA · Barrel% · Hard Hit% · Launch Angle — MLB 14-factor Statcast 4.",
  },
};

const LEAGUES: MlbLeagueSide[] = ["AL", "NL"];
const DIVISIONS: MlbDivisionSide[] = ["East", "Central", "West"];

type StatcastFactor = {
  key: "xwoba" | "barrelPct" | "hardHitPct" | "launchAngle";
  label: string;
  shortLabel: string;
  range: string;
  description: string;
  why: string;
  source: string;
};

const STATCAST_FACTORS: readonly StatcastFactor[] = [
  {
    key: "xwoba",
    label: "Expected wOBA (xwOBA)",
    shortLabel: "xwOBA",
    range: "0.200 ~ 0.500",
    description:
      "Expected wOBA estimated from launch angle + exit velocity. Removes luck (defense/ballpark/weather) to measure true contact quality.",
    why: "While wOBA measures actual outcomes, xwOBA eliminates result noise to reveal true hitting skill. Top weight among Statcast 4 in the 14-factor model.",
    source: "Baseball Savant — Statcast Era 2015~",
  },
  {
    key: "barrelPct",
    label: "Barrel %",
    shortLabel: "Barrel%",
    range: "0% ~ 25%",
    description:
      "Barrel = minimum launch angle + exit velocity threshold met = avg .500+ AVG / 1.500+ SLG expected. Percentage per plate appearance.",
    why: "Hard contact frequency. Raw signal for home run + extra-base production capacity.",
    source: "Baseball Savant — Barrel definition (2015 Tom Tango)",
  },
  {
    key: "hardHitPct",
    label: "Hard Hit %",
    shortLabel: "Hard Hit%",
    range: "20% ~ 55%",
    description:
      "Share of batted balls at 95 mph+ exit velocity. Lower threshold than Barrel = larger sample, more stable signal.",
    why: "95+ mph exit velocity sharply increases hit probability. Primary input axis for xwOBA.",
    source: "Baseball Savant — Hard Hit 95 mph definition",
  },
  {
    key: "launchAngle",
    label: "Launch Angle",
    shortLabel: "Launch Angle",
    range: "-30° ~ +50°",
    description:
      "Average batted ball launch angle. 10–25° = line drives / 25–35° = fly ball sweet spot. Too high = pop-up, too low = groundball.",
    why: "The angle axis of Barrel. Same exit velocity produces different outcomes based on angle.",
    source: "Baseball Savant — Launch Angle distribution",
  },
] as const;

function leagueName(league: MlbLeagueSide) {
  return league === "AL" ? "American League" : "National League";
}

function divisionLabel(league: MlbLeagueSide, division: MlbDivisionSide) {
  return `${league} ${division}`;
}

export default function MlbPlayersHubEn() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "MLB Statcast 4 Factors",
    description:
      "MLB 14-factor model Statcast 4 (xwOBA · Barrel% · Hard Hit% · Launch Angle) explained + 30-team measurement status.",
    url: `${SITE_URL}/en/mlb/players`,
    inLanguage: "en-US",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: 30,
      itemListElement: (Object.keys(MLB_TEAMS) as MlbTeamCode[]).map((code, i) => {
        const team = MLB_TEAMS[code];
        return {
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/en/mlb/team/${code}`,
          item: {
            "@type": "SportsTeam",
            name: team.name,
            sport: "Baseball",
            memberOf: { "@type": "SportsOrganization", name: "Major League Baseball" },
          },
        };
      }),
    },
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb
        items={[
          { href: "/en/mlb", label: "MLB Analysis" },
          { label: "Statcast 4 Factors" },
        ]}
        locale="en"
      />

      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">MLB Statcast 4 Factors</h1>
        <p className="text-gray-500 dark:text-gray-400">
          MLB 14-factor model = KBO 10 (FIP / xFIP / wOBA / Bullpen FIP / Recent Form / WAR / H2H / Park Factor / Elo / Defense SFR) + Statcast 4.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Currently shown: 4 factor explanations + 30-team entry paths. Team-level Statcast measurements (xwOBA · Barrel% · Hard Hit% · Launch Angle) live data integration = separate datasource integration carry-over.
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="statcast-factors-heading">
        <h2
          id="statcast-factors-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          Statcast 4 Factor Explanations
        </h2>
        <ol className="grid md:grid-cols-2 gap-4">
          {STATCAST_FACTORS.map((factor, idx) => (
            <li
              key={factor.key}
              className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] p-4 space-y-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-bold text-brand-700 dark:text-brand-100">
                  {idx + 1}. {factor.label}
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {factor.range}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200">{factor.description}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Why it matters:</span> {factor.why}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Source: {factor.source}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4" aria-labelledby="teams-heading">
        <div className="flex items-baseline justify-between gap-2 border-b border-gray-200 dark:border-[var(--color-border)] pb-2">
          <h2 id="teams-heading" className="text-xl font-bold">
            30 Teams
          </h2>
          <span className="text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 shrink-0">
            Team measurements ETA
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Each team card leads to a team profile (current: season placeholder + 14-factor explainer + home ballpark park factor). Statcast measurements carry-over in team profile.
        </p>
        {LEAGUES.map((league) => (
          <div key={league} className="space-y-4" aria-labelledby={`mlb-${league}-statcast`}>
            <h3
              id={`mlb-${league}-statcast`}
              className="text-base font-semibold text-gray-600 dark:text-gray-300"
            >
              {leagueName(league)}
            </h3>
            {DIVISIONS.map((division) => {
              const codes = MLB_DIVISIONS[league][division];
              return (
                <div key={`${league}-${division}`} className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {divisionLabel(league, division)}
                  </h4>
                  <ul className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {codes.map((code) => {
                      const team = MLB_TEAMS[code];
                      return (
                        <li key={code}>
                          <Link
                            href={`/en/mlb/players/${code}`}
                            className="flex items-center gap-2 bg-white dark:bg-[var(--color-surface-card)] rounded-lg border border-gray-200 dark:border-[var(--color-border)] p-2 hover:shadow-md hover:border-brand-500/50 transition-all"
                          >
                            <span
                              className="inline-block w-4 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: team.color }}
                              aria-hidden
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold truncate">{team.shortName}</p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                                PF {team.parkPf}
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
          </div>
        ))}
      </section>

      <footer className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[var(--color-border)] pt-4 space-y-1">
        <p>
          ※ Statcast data source: <a href="https://baseballsavant.mlb.com/" target="_blank" rel="noopener noreferrer" className="underline">Baseball Savant</a> (MLB Advanced Media). Scraper: <code>packages/kbo-data/src/scrapers/baseball-savant.ts</code>.
        </p>
        <p>
          ※ This hub = Statcast 4 explanation layer within the 14-factor model. Live team measurements = pending separate ingestion integration. KBO 10 factors = <Link href="/en/mlb/factors" className="underline">/en/mlb/factors</Link>.
        </p>
      </footer>
    </main>
  );
}
