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
  title: "MLB Wild Card race — AL/NL Wild Card 진출 경쟁 | MoneyBall Score",
  description: `MLB AL/NL 양리그 Wild Card ${MLB_WILDCARD_COUNT}장 진출 경쟁 실시간 순위 + game-back + Magic Number. ${FACTOR_TOTAL}팩터 본선 base.`,
  alternates: {
    canonical: `${SITE_URL}/mlb/wild-card`,
    languages: {
      en: `${SITE_URL}/en/mlb/wild-card`,
      ko: `${SITE_URL}/mlb/wild-card`,
    },
  },
  openGraph: {
    title: "MLB Wild Card race | MoneyBall Score",
    description: `MLB AL/NL Wild Card ${MLB_WILDCARD_COUNT}장 진출 경쟁 실시간 순위 + ${FACTOR_TOTAL}팩터 본선 base.`,
    url: `${SITE_URL}/mlb/wild-card`,
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB Wild Card race | MoneyBall Score",
    description: `MLB AL/NL Wild Card ${MLB_WILDCARD_COUNT}장 진출 경쟁 실시간 순위 + ${FACTOR_TOTAL}팩터 본선 base.`,
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
      {value === 0 ? "Wild Card 진출 확정" : `Wild Card 매직넘버 ${value}`}
    </p>
  );
}

export default async function MlbWildCardHub() {
  const divisionStandings = await buildMlbDivisionStandings();
  const wildcardStandings = buildMlbWildcardStandings(divisionStandings);

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
          AL/NL 양리그 — Wild Card {MLB_WILDCARD_COUNT}장 진출 경쟁. division 1위 {MLB_DIVISION_COUNT}팀 외 잔여팀 가운데 리그별 승률 상위 {MLB_WILDCARD_COUNT}팀 진출.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          종료(final) 경기 기준 실시간 순위 · game-back · Magic Number + {FACTOR_TOTAL}팩터 본선 base.
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
          <li>Wild Card {MLB_WILDCARD_COUNT}장 진출 경쟁 순위 + game-back + Magic Number — <strong>박제 완료</strong></li>
          <li>Postseason 브라켓 (WC / DS / LCS / WS) 시각화 — <strong>ETA 2026-09</strong></li>
        </ul>
      </section>

      <section className="space-y-5" aria-labelledby="wc-race-heading">
        <h2
          id="wc-race-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          Wild Card race — AL/NL division 1위 {MLB_DIVISION_COUNT}팀 외
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          각 리그 division 1위 3팀 = 자동 진출. 잔여 팀 가운데 승률 상위 {MLB_WILDCARD_COUNT}팀 = Wild Card 진출. GB = 컷오프({MLB_WILDCARD_COUNT}번째 팀) 기준 (+ = 여유, 숫자만 = 추격 필요).
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
                        href={`/mlb/team/${row.teamCode}`}
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
          ※ 본 hub = Header NAV 깨진 link 회수 layer 로 시작 — 이후 mlb_schedule 종료 경기 실측 기반 라이브 Wild Card race 로 확장(cycle 2305).
        </p>
        <p>
          ※ 관련: <Link href="/mlb/standings" className="underline">/mlb/standings</Link> · <Link href="/mlb/postseason" className="underline">/mlb/postseason</Link> · <Link href="/mlb" className="underline">/mlb</Link> hub.
        </p>
      </footer>
    </main>
  );
}
