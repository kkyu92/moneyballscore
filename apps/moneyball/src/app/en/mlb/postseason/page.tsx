import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export const revalidate = 21600;

const SITE_URL = "https://moneyballscore.vercel.app";

export const metadata: Metadata = {
  title: "MLB Postseason Bracket — WC / DS / LCS / WS | MoneyBall Score",
  description:
    "MLB Postseason 4 rounds (Wild Card / Division Series / League Championship / World Series) bracket + 14-factor model series predictions. Live integration ETA 2026-09.",
  alternates: {
    canonical: `${SITE_URL}/en/mlb/postseason`,
    languages: {
      en: `${SITE_URL}/en/mlb/postseason`,
      ko: `${SITE_URL}/mlb/postseason`,
    },
  },
  openGraph: {
    title: "MLB Postseason Bracket | MoneyBall Score",
    description:
      "MLB Postseason 4-round bracket + 14-factor series predictions — Live integration ETA 2026-09.",
    url: `${SITE_URL}/en/mlb/postseason`,
    type: "website",
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
    format: "Best-of-3 — Top seed hosts all 3 games",
    description:
      "Among the 4 remaining teams per league (division runner-up + 3 Wild Card teams), seeds 4·5 face seed 6. Seeds 1·2·3 get a bye. Division leaders seeded 1·2 advance directly to DS.",
  },
  {
    key: "ds",
    label: "Division Series (DS)",
    shortLabel: "DS",
    format: "Best-of-5 — 2-2-1 format (higher seed hosts first)",
    description:
      "WC winners + division leader seeds 1·2·3 meet. Two series per league = ALDS / NLDS. Series winners advance to LCS.",
  },
  {
    key: "lcs",
    label: "League Championship Series (LCS)",
    shortLabel: "LCS",
    format: "Best-of-7 — 2-3-2 format (higher seed hosts first)",
    description:
      "DS winners from each league meet = ALCS / NLCS. Determines the league pennant. Winner advances to World Series.",
  },
  {
    key: "ws",
    label: "World Series (WS)",
    shortLabel: "WS",
    format: "Best-of-7 — 2-3-2 format (higher win% hosts first)",
    description:
      "AL pennant vs NL pennant. Determines the MLB champion. Championship held since 1903.",
  },
] as const;

export default function MlbPostseasonHubEn() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "MLB Postseason Bracket",
    description:
      "MLB Postseason 4 rounds (Wild Card / Division Series / League Championship / World Series) bracket + 14-factor model series predictions.",
    url: `${SITE_URL}/en/mlb/postseason`,
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
          { href: "/en/mlb", label: "MLB Analysis" },
          { label: "Postseason Bracket" },
        ]}
        locale="en"
      />

      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-amber-700 dark:text-amber-200">
          ⭐ MLB Postseason Bracket
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          After the regular season ends — 4-round playoff: Wild Card / Division Series / League Championship / World Series.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ETA 2026-09 — Live series-by-series 14-factor predictions + bracket visualization activates immediately after the regular season.
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
          Progress Status
        </h2>
        <ul className="text-sm text-amber-900 dark:text-amber-100 space-y-1 list-disc list-inside">
          <li>MLB 162-game full ingestion + 14-factor model — <strong>Complete</strong></li>
          <li>30-team standings + season game-back tracking — <strong>Complete</strong> (<Link href="/en/mlb/standings" className="underline">/en/mlb/standings</Link>)</li>
          <li>Wild Card race tracking — <strong>ETA 2026-08</strong> (<Link href="/en/mlb/wild-card" className="underline">/en/mlb/wild-card</Link>)</li>
          <li>Postseason bracket + per-series 14-factor predictions — <strong>ETA 2026-09</strong></li>
        </ul>
      </section>

      <section className="space-y-4" aria-labelledby="rounds-heading">
        <h2
          id="rounds-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          Postseason 4 Rounds
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
          ※ This hub = broken NAV link recovery layer (cycle 1029). Live Postseason bracket + per-series 14-factor predictions = ETA 2026-09 (activates immediately after regular season ends).
        </p>
        <p>
          ※ Related: <Link href="/en/mlb/wild-card" className="underline">/en/mlb/wild-card</Link> · <Link href="/en/mlb/standings" className="underline">/en/mlb/standings</Link> · <Link href="/en/mlb" className="underline">/en/mlb</Link> hub.
        </p>
      </footer>
    </main>
  );
}
