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
  title: "MLB AL/NL Standings — 6 Division Standings | MoneyBall Score",
  description:
    "MLB AL/NL × East/Central/West 6-division team composition and park factor distribution. Live season standings integration coming soon.",
  alternates: {
    canonical: `${SITE_URL}/en/mlb/standings`,
    languages: {
      en: `${SITE_URL}/en/mlb/standings`,
      ko: `${SITE_URL}/mlb/standings`,
    },
  },
  openGraph: {
    title: "MLB AL/NL Standings — 6 Divisions | MoneyBall Score",
    description: "AL/NL × East/Central/West 6-division team composition and park factors.",
    url: `${SITE_URL}/en/mlb/standings`,
    type: "website",
  },
};

const LEAGUES: MlbLeagueSide[] = ["AL", "NL"];
const DIVISIONS: MlbDivisionSide[] = ["East", "Central", "West"];

function leagueName(league: MlbLeagueSide) {
  return league === "AL" ? "American League" : "National League";
}

function divisionLabel(league: MlbLeagueSide, division: MlbDivisionSide) {
  return `${league} ${division}`;
}

function parkTone(parkPf: number): "hitter" | "pitcher" | "neutral" {
  if (parkPf >= 105) return "hitter";
  if (parkPf <= 95) return "pitcher";
  return "neutral";
}

function parkLabel(tone: "hitter" | "pitcher" | "neutral") {
  if (tone === "hitter") return "Hitter-friendly";
  if (tone === "pitcher") return "Pitcher-friendly";
  return "Neutral";
}

export default function MlbStandingsHubEn() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "MLB AL/NL Standings — 6 Divisions",
    description:
      "MLB AL/NL × East/Central/West 6-division team composition. Live season W/L standings integration coming soon.",
    url: `${SITE_URL}/en/mlb/standings`,
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
            location: { "@type": "Place", name: team.stadium },
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
          { label: "AL/NL Standings" },
        ]}
        locale="en"
      />
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">MLB AL/NL Standings</h1>
        <p className="text-gray-500 dark:text-gray-400">
          AL/NL × East/Central/West 6 divisions · 30 teams. Live season standings integration coming soon.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Currently shown: team composition + home ballpark park factors. Live season W/L/GB records = pending separate datasource integration.
        </p>
      </header>

      {LEAGUES.map((league) => (
        <section key={league} className="space-y-5" aria-labelledby={`mlb-${league}-standings`}>
          <h2
            id={`mlb-${league}-standings`}
            className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
          >
            {leagueName(league)}
          </h2>
          {DIVISIONS.map((division) => {
            const codes = MLB_DIVISIONS[league][division];
            return (
              <div key={`${league}-${division}`} className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {divisionLabel(league, division)}
                </h3>
                <ol className="space-y-2">
                  {codes.map((code, idx) => {
                    const team = MLB_TEAMS[code];
                    const tone = parkTone(team.parkPf);
                    return (
                      <li key={code}>
                        <Link
                          href={`/en/mlb/team/${code}`}
                          className="flex items-center gap-3 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3 hover:shadow-md hover:border-brand-500/50 transition-all"
                        >
                          <span
                            aria-hidden
                            className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full bg-gray-100 dark:bg-[var(--color-surface-hover)] text-gray-600 dark:text-gray-300 shrink-0"
                          >
                            {idx + 1}
                          </span>
                          <span
                            className="inline-block w-6 h-6 rounded-full shrink-0"
                            style={{ backgroundColor: team.color }}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate">{team.shortName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {team.city} · {team.stadium}
                            </p>
                          </div>
                          <span
                            className={
                              "text-xs px-2 py-1 rounded-md shrink-0 " +
                              (tone === "hitter"
                                ? "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                : tone === "pitcher"
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                  : "bg-gray-50 text-gray-600 dark:bg-gray-800/40 dark:text-gray-300")
                            }
                          >
                            PF {team.parkPf} · {parkLabel(tone)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </section>
      ))}

      <footer className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[var(--color-border)] pt-4 space-y-1">
        <p>
          ※ Order within each division is alphabetical by team code. Sort will update once live W/L/Win% records are integrated.
        </p>
        <p>
          ※ Park factor: 100 = league neutral, 100+ = hitter-friendly, below 100 = pitcher-friendly. Source: Baseball Savant 5-year average (2020–2024).
        </p>
      </footer>
    </main>
  );
}
