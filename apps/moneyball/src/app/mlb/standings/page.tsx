import type { Metadata } from "next";
import Link from "next/link";
import {
  MLB_TEAMS,
  MLB_TEAM_COUNT,
  MLB_DIVISION_COUNT,
  MLB_GAMES_PER_TEAM,
  PARK_FACTOR_HITTER_MIN,
  PARK_FACTOR_PITCHER_MAX,
  type MlbTeamCode,
  type MlbLeagueSide,
  type MlbDivisionSide, SITE_URL
} from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { MlbTeamLogo } from "@/components/shared/MlbTeamLogo";
import { buildMlbDivisionStandings } from "@/lib/mlb/buildMlbStandings";
import { computeMagicNumber } from "@/lib/standings/computeMagicNumber";

export const revalidate = 21600; // MLB_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export const metadata: Metadata = {
  title: `MLB AL/NL 순위 — ${MLB_DIVISION_COUNT} division standings | MoneyBall Score`,
  description: `MLB AL/NL × East/Central/West ${MLB_DIVISION_COUNT} division 실시간 W-L 순위, GB, 파크팩터.`,
  alternates: {
    canonical: `${SITE_URL}/mlb/standings`,
    languages: {
      en: `${SITE_URL}/en/mlb/standings`,
      ko: `${SITE_URL}/mlb/standings`,
    },
  },
  openGraph: {
    title: `MLB AL/NL 순위 — ${MLB_DIVISION_COUNT} division | MoneyBall Score`,
    description: `AL/NL × East/Central/West ${MLB_DIVISION_COUNT} division 실시간 W-L 순위.`,
    url: `${SITE_URL}/mlb/standings`,
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: `MLB AL/NL 순위 — ${MLB_DIVISION_COUNT} division | MoneyBall Score`,
    description: `AL/NL × East/Central/West ${MLB_DIVISION_COUNT} division 실시간 W-L 순위.`,
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
  if (parkPf >= PARK_FACTOR_HITTER_MIN) return "hitter";
  if (parkPf <= PARK_FACTOR_PITCHER_MAX) return "pitcher";
  return "neutral";
}

function parkLabel(tone: "hitter" | "pitcher" | "neutral") {
  if (tone === "hitter") return "타자 친화";
  if (tone === "pitcher") return "투수 친화";
  return "중립";
}

function formatGB(gb: number | null): string {
  if (gb === null) return "-";
  if (gb === 0) return "0.0";
  return gb % 1 === 0 ? `${gb}.0` : String(gb);
}

export default async function MlbStandingsHub() {
  const standings = await buildMlbDivisionStandings();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    inLanguage: "ko-KR",
    name: `MLB AL/NL 순위 — ${MLB_DIVISION_COUNT} division`,
    description: `MLB AL/NL × East/Central/West ${MLB_DIVISION_COUNT} division 실시간 W-L 순위.`,
    url: `${SITE_URL}/mlb/standings`,
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
          { label: "AL/NL 순위" },
        ]}
      />
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">MLB AL/NL 순위</h1>
        <p className="text-gray-500 dark:text-gray-400">
          AL/NL × East/Central/West {MLB_DIVISION_COUNT} division · {MLB_TEAM_COUNT}팀. 실시간 W-L 순위 + GB.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          W-L: 종료된 경기 기준 집계 · GB: division 1위와의 격차.
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
            const rows = standings[league][division];
            const divisionMagicNumber =
              rows.length >= 2 ? computeMagicNumber(rows[0], rows[1], MLB_GAMES_PER_TEAM) : null;
            return (
              <div key={`${league}-${division}`} className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {divisionLabel(league, division)}
                </h3>
                <ol className="space-y-2">
                  {rows.map((row, idx) => {
                    const code = row.teamCode;
                    const team = MLB_TEAMS[code];
                    const tone = parkTone(team.parkPf);
                    const showMagicNumber = idx === 0 && divisionMagicNumber !== null;
                    return (
                      <li key={code}>
                        <Link
                          href={`/mlb/team/${code}`}
                          className="flex items-center gap-3 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-3 hover:shadow-md hover:border-brand-500/50 transition-all"
                        >
                          <span
                            aria-hidden
                            className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full bg-gray-100 dark:bg-[var(--color-surface-hover)] text-gray-600 dark:text-gray-300 shrink-0"
                          >
                            {idx + 1}
                          </span>
                          <MlbTeamLogo team={code} size={24} className="rounded-full shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate">{team.shortName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono tabular-nums">
                              {row.wins}-{row.losses} · {row.winPct.toFixed(3).replace(/^0/, "")} · GB {formatGB(row.gamesBehind)}
                            </p>
                            {showMagicNumber && (
                              <p className="text-xs font-semibold tabular-nums text-brand-600 dark:text-brand-400">
                                {divisionMagicNumber === 0
                                  ? "지구 우승 확정"
                                  : `지구 우승 매직넘버 ${divisionMagicNumber}`}
                              </p>
                            )}
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
          ※ 순서: division 안 승률(Win%) 내림차순. W-L 은 종료(final) 경기만 집계.
        </p>
        <p>
          ※ 파크팩터: 100 = 리그 중립, 100+ 타자 친화, 100- 투수 친화. 출처: Baseball Savant 5-year (2020-2024).
        </p>
        <p>
          ※ 지구 우승 매직넘버: division 1위가 2위를 승수로 앞선 경우만 표시 (와일드카드 매직넘버는 미포함).
        </p>
      </footer>
    </main>
  );
}
