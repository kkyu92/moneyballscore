import type { Metadata } from "next";
import Link from "next/link";
import {
  MLB_TEAMS,
  MLB_DIVISIONS,
  MLB_TEAM_COUNT,
  type MlbTeamCode,
  type MlbLeagueSide,
  type MlbDivisionSide, SITE_URL
} from "@moneyball/shared";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export const revalidate = 21600; // MLB_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export const metadata: Metadata = {
  title: `MLB 팀 프로필 — ${MLB_TEAM_COUNT}팀 시즌 stat | MoneyBall Score`,
  description: `MLB ${MLB_TEAM_COUNT}팀 (AL 15 + NL 15) 시즌 예측 기록 · ${MLB_FACTOR_COUNTS.total}팩터 (KBO ${MLB_FACTOR_COUNTS.kbo} + Statcast ${MLB_FACTOR_COUNTS.statcast}) · 홈구장 파크팩터.`,
  alternates: {
    canonical: `${SITE_URL}/mlb/team`,
    languages: {
      en: `${SITE_URL}/en/mlb/team`,
      ko: `${SITE_URL}/mlb/team`,
    },
  },
  openGraph: {
    title: `MLB 팀 프로필 ${MLB_TEAM_COUNT}팀 | MoneyBall Score`,
    description: `MLB ${MLB_TEAM_COUNT}팀 시즌 예측 기록 + ${MLB_FACTOR_COUNTS.total}팩터`,
    url: `${SITE_URL}/mlb/team`,
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: `MLB 팀 프로필 ${MLB_TEAM_COUNT}팀 | MoneyBall Score`,
    description: `MLB ${MLB_TEAM_COUNT}팀 시즌 예측 기록 + ${MLB_FACTOR_COUNTS.total}팩터`,
  },
};

const LEAGUES: MlbLeagueSide[] = ["AL", "NL"];
const DIVISIONS: MlbDivisionSide[] = ["East", "Central", "West"];

function divisionLabel(league: MlbLeagueSide, division: MlbDivisionSide) {
  return `${league} ${division}`;
}

export default function MlbTeamsHub() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "MLB 팀 프로필",
    description: `MLB ${MLB_TEAM_COUNT}팀 시즌 예측 기록 · ${MLB_FACTOR_COUNTS.total}팩터 · 홈구장 파크팩터`,
    url: `${SITE_URL}/mlb/team`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: MLB_TEAM_COUNT,
      itemListElement: (Object.keys(MLB_TEAMS) as MlbTeamCode[]).map((code, i) => {
        const team = MLB_TEAMS[code];
        return {
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/mlb/team/${code}`,
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
          { href: "/mlb", label: "MLB 분석" },
          { label: "팀" },
        ]}
      />
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">MLB 팀 프로필</h1>
        <p className="text-gray-500 dark:text-gray-400">
          AL 15팀 + NL 15팀 = {MLB_TEAM_COUNT}팀. 시즌 예측 기록 · {MLB_FACTOR_COUNTS.total}팩터 (KBO {MLB_FACTOR_COUNTS.kbo} + Statcast {MLB_FACTOR_COUNTS.statcast}) · 홈구장 파크팩터.
        </p>
      </header>

      {LEAGUES.map((league) => (
        <section key={league} className="space-y-5" aria-labelledby={`mlb-${league}`}>
          <h2 id={`mlb-${league}`} className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2">
            {league === "AL" ? "American League" : "National League"}
          </h2>
          {DIVISIONS.map((division) => {
            const codes = MLB_DIVISIONS[league][division];
            return (
              <div key={`${league}-${division}`} className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {divisionLabel(league, division)}
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {codes.map((code) => {
                    const team = MLB_TEAMS[code];
                    const parkAdvantage =
                      team.parkPf >= 105
                        ? "타자 친화"
                        : team.parkPf <= 95
                          ? "투수 친화"
                          : "중립";
                    return (
                      <li key={code}>
                        <Link
                          href={`/mlb/team/${code}`}
                          className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 hover:shadow-md hover:border-brand-500/50 transition-all space-y-2"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="inline-block w-8 h-8 rounded-full shrink-0"
                              style={{ backgroundColor: team.color }}
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{team.shortName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {team.city}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            파크팩터 {team.parkPf} · {parkAdvantage}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}
