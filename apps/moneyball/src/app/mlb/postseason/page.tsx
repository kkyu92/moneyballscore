import type { Metadata } from "next";
import Link from "next/link";
import { MLB_TEAM_COUNT, MLB_GAMES_PER_TEAM, SITE_URL } from "@moneyball/shared";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export const revalidate = 21600; // MLB_ISR_SECONDS (Next.js 16 Turbopack: literal required)

const FACTOR_TOTAL = MLB_FACTOR_COUNTS.total;

export const metadata: Metadata = {
  title: "MLB Postseason 브라켓 — WC / DS / LCS / WS | MoneyBall Score",
  description: `MLB Postseason 4 라운드 (Wild Card / Division Series / League Championship / World Series) 브라켓 + ${FACTOR_TOTAL}팩터 본선 시리즈별 예측. ETA 2026-09 라이브 통합.`,
  alternates: {
    canonical: `${SITE_URL}/mlb/postseason`,
    languages: {
      en: `${SITE_URL}/en/mlb/postseason`,
      ko: `${SITE_URL}/mlb/postseason`,
    },
  },
  openGraph: {
    title: "MLB Postseason 브라켓 | MoneyBall Score",
    description: `MLB Postseason 4 라운드 브라켓 + ${FACTOR_TOTAL}팩터 시리즈 예측 — ETA 2026-09 라이브 통합.`,
    url: `${SITE_URL}/mlb/postseason`,
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB Postseason 브라켓 | MoneyBall Score",
    description: `MLB Postseason 4 라운드 브라켓 + ${FACTOR_TOTAL}팩터 시리즈 예측 — ETA 2026-09 라이브 통합.`,
  },
};

type PostseasonRound = {
  key: "wc" | "ds" | "lcs" | "ws";
  label: string;
  shortLabel: string;
  format: string;
  description: string;
};

const ROUNDS: readonly PostseasonRound[] = [
  {
    key: "wc",
    label: "Wild Card Series (WC)",
    shortLabel: "WC",
    format: "3전 2선승 — 상위 시드 홈 3연전",
    description:
      "양리그 잔여 4팀 (division 2위 + Wild Card 3팀) 가운데 시드 4·5 vs 시드 6 충돌. 상위 시드 1·2·3 = bye. division 1위 1·2 시드 자동 DS 직행.",
  },
  {
    key: "ds",
    label: "Division Series (DS)",
    shortLabel: "DS",
    format: "5전 3선승 — 2-2-1 시리즈 (상위 시드 홈 우선)",
    description:
      "WC 승자 2팀 + division 1위 시드 1·2·3 충돌. 양리그 각 2시리즈 = ALDS / NLDS. 시리즈 승자 LCS 진출.",
  },
  {
    key: "lcs",
    label: "League Championship Series (LCS)",
    shortLabel: "LCS",
    format: "7전 4선승 — 2-3-2 시리즈 (상위 시드 홈 우선)",
    description:
      "양리그 DS 승자 충돌 = ALCS / NLCS. League pennant 결정. 승자 WS 진출.",
  },
  {
    key: "ws",
    label: "World Series (WS)",
    shortLabel: "WS",
    format: "7전 4선승 — 2-3-2 시리즈 (상위 승률 홈 우선)",
    description:
      "AL pennant vs NL pennant 충돌. 최종 MLB champion 결정. 1903년 시작 챔피언십.",
  },
] as const;

export default function MlbPostseasonHub() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "MLB Postseason 브라켓",
    description: `MLB Postseason 4 라운드 (Wild Card / Division Series / League Championship / World Series) 브라켓 + ${FACTOR_TOTAL}팩터 본선 시리즈별 예측.`,
    url: `${SITE_URL}/mlb/postseason`,
    isPartOf: {
      "@type": "WebSite",
      name: "MoneyBall Score",
      url: SITE_URL,
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
          { label: "Postseason 브라켓" },
        ]}
      />

      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-amber-700 dark:text-amber-200">
          ⭐ MLB Postseason 브라켓
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          정규시즌 종료 후 4 라운드 toss-up — Wild Card / Division Series / League Championship / World Series.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ETA 2026-09 — 정규시즌 종료 직후 시리즈별 {FACTOR_TOTAL}팩터 본선 base 라이브 예측 + 브라켓 시각화 활성.
        </p>
      </header>

      <section
        className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-5 space-y-2"
        aria-labelledby="ps-status-heading"
      >
        <h2
          id="ps-status-heading"
          className="text-base font-bold text-amber-800 dark:text-amber-200"
        >
          준비 진행 status
        </h2>
        <ul className="text-sm text-amber-900 dark:text-amber-100 space-y-1 list-disc list-inside">
          <li>MLB {MLB_GAMES_PER_TEAM}game 풀 인제스트 + {FACTOR_TOTAL}팩터 본선 — <strong>박제 완료</strong></li>
          <li>{MLB_TEAM_COUNT}팀 standings + 시즌 game-back 추적 — <strong>박제 완료</strong> (<Link href="/mlb/standings" className="underline">/mlb/standings</Link>)</li>
          <li>Wild Card race 추적 — <strong>ETA 2026-08</strong> (<Link href="/mlb/wild-card" className="underline">/mlb/wild-card</Link>)</li>
          <li>Postseason 브라켓 + 시리즈별 {FACTOR_TOTAL}팩터 예측 — <strong>ETA 2026-09</strong></li>
        </ul>
      </section>

      <section className="space-y-4" aria-labelledby="rounds-heading">
        <h2
          id="rounds-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          Postseason 4 라운드 설명
        </h2>
        <ol className="grid md:grid-cols-2 gap-4">
          {ROUNDS.map((round, idx) => (
            <li
              key={round.key}
              className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] p-4 space-y-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-bold text-brand-700 dark:text-brand-100">
                  {idx + 1}. {round.label}
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {round.shortLabel}
                </span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                {round.format}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-200">{round.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[var(--color-border)] pt-4 space-y-1">
        <p>
          ※ 본 hub = Header NAV 깨진 link 회수 layer. 라이브 Postseason 브라켓 + 시리즈별 {FACTOR_TOTAL}팩터 예측 = ETA 2026-09 (정규시즌 종료 직후 활성).
        </p>
        <p>
          ※ 관련: <Link href="/mlb/wild-card" className="underline">/mlb/wild-card</Link> · <Link href="/mlb/standings" className="underline">/mlb/standings</Link> · <Link href="/mlb" className="underline">/mlb</Link> hub.
        </p>
      </footer>
    </main>
  );
}
