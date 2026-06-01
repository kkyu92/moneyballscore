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
  title: "MLB Statcast 4 팩터 — xwOBA · Barrel% · Hard Hit% · Launch Angle | MoneyBall Score",
  description:
    "MLB 14팩터 본선 안 Statcast 4 (xwOBA · Barrel% · Hard Hit% · Launch Angle) 설명 + 30팀 측정 status. 팀별 Statcast 측정 데이터 연동 ETA carry-over.",
  alternates: {
    canonical: `${SITE_URL}/mlb/players`,
    languages: {
      en: `${SITE_URL}/en/mlb/players`,
      ko: `${SITE_URL}/mlb/players`,
    },
  },
  openGraph: {
    title: "MLB Statcast 4 팩터 | MoneyBall Score",
    description: "xwOBA · Barrel% · Hard Hit% · Launch Angle — MLB 14팩터 본선 Statcast 4.",
    url: `${SITE_URL}/mlb/players`,
    type: "website",
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
      "타구의 발사 각도 + 타구 속도로 추정한 기대 wOBA. 운 (수비/구장/날씨) 제거 후 진짜 컨택 품질.",
    why: "wOBA 가 실제 결과를 측정하면, xwOBA 는 결과 잡음 제거 후 컨택 실력. 14팩터 본선 안 Statcast 1번 가중치.",
    source: "Baseball Savant — Statcast Era 2015~",
  },
  {
    key: "barrelPct",
    label: "Barrel %",
    shortLabel: "Barrel%",
    range: "0% ~ 25%",
    description:
      "Barrel = 최소 발사 각도 + 타구 속도 임계 만족 = 평균 .500+ AVG / 1.500+ SLG 기대. 타석당 % 비율.",
    why: "강타 빈도 측정. 홈런 + 장타 production capacity 의 raw signal.",
    source: "Baseball Savant — Barrel 정의 (2015 Tom Tango)",
  },
  {
    key: "hardHitPct",
    label: "Hard Hit %",
    shortLabel: "Hard Hit%",
    range: "20% ~ 55%",
    description:
      "타구 속도 95mph 이상 비율. Barrel 보다 임계 낮음 = 더 큰 sample, stable signal.",
    why: "타구 속도 95+ = 안타 확률 급증. xwOBA 의 핵심 input 1축.",
    source: "Baseball Savant — Hard Hit 95mph 정의",
  },
  {
    key: "launchAngle",
    label: "Launch Angle",
    shortLabel: "Launch Angle",
    range: "-30° ~ +50°",
    description:
      "평균 타구 발사 각도. 10~25° = 라인 드라이브 / 25~35° = 플라이볼 sweet spot. 너무 높으면 팝업, 너무 낮으면 땅볼.",
    why: "barrel 의 angle 축. 같은 타구 속도라도 angle 따라 결과 다름.",
    source: "Baseball Savant — Launch Angle distribution",
  },
] as const;

function leagueName(league: MlbLeagueSide) {
  return league === "AL" ? "American League" : "National League";
}

function divisionLabel(league: MlbLeagueSide, division: MlbDivisionSide) {
  return `${league} ${division}`;
}

export default function MlbPlayersHub() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "MLB Statcast 4 팩터",
    description:
      "MLB 14팩터 본선 안 Statcast 4 (xwOBA · Barrel% · Hard Hit% · Launch Angle) 설명 + 30팀 측정 status.",
    url: `${SITE_URL}/mlb/players`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: 30,
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
          { label: "Statcast 4 팩터" },
        ]}
      />

      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">MLB Statcast 4 팩터</h1>
        <p className="text-gray-500 dark:text-gray-400">
          MLB 14팩터 본선 = KBO 10 (FIP / xFIP / wOBA / 불펜 FIP / 최근폼 / WAR / 상대전적 / 구장보정 / Elo / 수비 SFR) + Statcast 4.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          현재 표시: 4 팩터 설명 + 30팀 진입 path. 팀별 Statcast 실측 (xwOBA · Barrel% · Hard Hit% · Launch Angle) 라이브 데이터 연동 = 별도 datasource 통합 carry-over.
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="statcast-factors-heading">
        <h2
          id="statcast-factors-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          Statcast 4 팩터 설명
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
                <span className="font-semibold">왜 중요한가:</span> {factor.why}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                출처: {factor.source}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4" aria-labelledby="teams-heading">
        <div className="flex items-baseline justify-between gap-2 border-b border-gray-200 dark:border-[var(--color-border)] pb-2">
          <h2 id="teams-heading" className="text-xl font-bold">
            30팀 진입
          </h2>
          <span className="text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 shrink-0">
            팀별 측정 ETA
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          각 팀 카드 → 팀 프로필 (현재: 시즌 placeholder + 14팩터 explainer + 홈구장 파크팩터). Statcast 실측 수치는 팀 프로필 안 carry-over 박제.
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
                            href={`/mlb/players/${code}`}
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
          ※ Statcast 측정 출처: <a href="https://baseballsavant.mlb.com/" target="_blank" rel="noopener noreferrer" className="underline">Baseball Savant</a> (MLB Advanced Media). 스크래퍼: <code>packages/kbo-data/src/scrapers/baseball-savant.ts</code>.
        </p>
        <p>
          ※ 본 hub = 14팩터 본선 안 Statcast 4 의 설명 layer. 라이브 팀별 실측 데이터 = 별도 ingestion 통합 시 박제. KBO 10팩터 = <Link href="/mlb/factors" className="underline">/mlb/factors</Link>.
        </p>
      </footer>
    </main>
  );
}
