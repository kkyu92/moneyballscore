import type { Metadata } from "next";
import Link from "next/link";
import {
  MLB_TEAMS,
  MLB_DIVISIONS,
  MLB_TEAM_COUNT,
  MLB_DIVISION_COUNT,
  MLB_GAMES_PER_TEAM,
  type MlbTeamCode,
  type MlbLeagueSide, SITE_URL
} from "@moneyball/shared";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

const FACTOR_TOTAL = MLB_FACTOR_COUNTS.total;

export const revalidate = 21600; // MLB_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export const metadata: Metadata = {
  title: "MLB Wild Card race — AL/NL Wild Card 진출 경쟁 | MoneyBall Score",
  description: `MLB AL/NL 양리그 Wild Card 3장 진출 경쟁. 9월 막판 game-back 추적 + ${FACTOR_TOTAL}팩터 본선 base. ETA 2026-08 라이브 데이터 통합.`,
  alternates: {
    canonical: `${SITE_URL}/mlb/wild-card`,
    languages: {
      en: `${SITE_URL}/en/mlb/wild-card`,
      ko: `${SITE_URL}/mlb/wild-card`,
    },
  },
  openGraph: {
    title: "MLB Wild Card race | MoneyBall Score",
    description: `MLB AL/NL Wild Card 3장 진출 경쟁 + ${FACTOR_TOTAL}팩터 본선 base — ETA 2026-08 라이브 데이터.`,
    url: `${SITE_URL}/mlb/wild-card`,
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB Wild Card race | MoneyBall Score",
    description: `MLB AL/NL Wild Card 3장 진출 경쟁 + ${FACTOR_TOTAL}팩터 본선 base — ETA 2026-08 라이브 데이터.`,
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

export default function MlbWildCardHub() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <Breadcrumb
        items={[
          { href: "/mlb", label: "MLB 분석" },
          { label: "Wild Card race" },
        ]}
      />

      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-amber-700 dark:text-amber-200">
          ⭐ MLB Wild Card race
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          AL/NL 양리그 — Wild Card 3장 진출 경쟁. division 1위 {MLB_DIVISION_COUNT}팀 외 잔여 {MLB_TEAM_COUNT - MLB_DIVISION_COUNT}팀 가운데 양리그 3팀씩 진출.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ETA 2026-08 — 9월 막판 game-back / Magic Number 추적 + {FACTOR_TOTAL}팩터 본선 base 라이브 데이터 통합.
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
          준비 진행 status
        </h2>
        <ul className="text-sm text-amber-900 dark:text-amber-100 space-y-1 list-disc list-inside">
          <li>MLB {MLB_GAMES_PER_TEAM}game 풀 인제스트 + {FACTOR_TOTAL}팩터 본선 — <strong>박제 완료</strong></li>
          <li>{MLB_TEAM_COUNT}팀 standings (AL/NL × E/C/W {MLB_DIVISION_COUNT} division) — <strong>박제 완료</strong> (<Link href="/mlb/standings" className="underline">/mlb/standings</Link>)</li>
          <li>Wild Card 3장 진출 경쟁 추적 + game-back 라이브 — <strong>ETA 2026-08</strong></li>
          <li>Postseason 브라켓 (WC / DS / LCS / WS) 시각화 — <strong>ETA 2026-09</strong></li>
        </ul>
      </section>

      <section className="space-y-4" aria-labelledby="wc-pool-heading">
        <h2
          id="wc-pool-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          Wild Card 후보 pool — AL/NL division 1위 {MLB_DIVISION_COUNT}팀 외
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          각 리그 {MLB_TEAM_COUNT / 2}팀 중 division 1위 3팀 = 자동 진출. 잔여 {MLB_TEAM_COUNT / 2 - 3}팀 가운데 승률 top 3 = Wild Card 진출. 본 hub 는 {MLB_TEAM_COUNT}팀 진입 path 만 박제 — 라이브 game-back 데이터는 ETA 도달 시 활성.
        </p>
        {LEAGUES.map((league) => {
          const codes = leagueAllCodes(league);
          return (
            <div key={league} className="space-y-2" aria-labelledby={`wc-${league}-heading`}>
              <h3
                id={`wc-${league}-heading`}
                className="text-base font-semibold text-gray-600 dark:text-gray-300"
              >
                {leagueName(league)} ({codes.length}팀)
              </h3>
              <ul className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {codes.map((code) => {
                  const team = MLB_TEAMS[code];
                  return (
                    <li key={code}>
                      <Link
                        href={`/mlb/team/${code}`}
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
          ※ 본 hub = Header NAV 깨진 link 회수 layer. 라이브 Wild Card race 데이터 통합 = ETA 2026-08 (정규시즌 9월 막판 game-back 측정 활성).
        </p>
        <p>
          ※ 관련: <Link href="/mlb/standings" className="underline">/mlb/standings</Link> · <Link href="/mlb/postseason" className="underline">/mlb/postseason</Link> · <Link href="/mlb" className="underline">/mlb</Link> hub.
        </p>
      </footer>
    </main>
  );
}
