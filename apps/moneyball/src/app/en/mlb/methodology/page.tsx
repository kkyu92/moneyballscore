import type { Metadata } from "next";
import Link from "next/link";
import { MLB_FACTOR_COUNTS, MLB_ELO_K, MLB_ELO_K_POSTSEASON } from "@moneyball/kbo-data";
import { SITE_URL, MLB_SCORING_RULE, HOME_ADVANTAGE_PCT } from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TableOfContents } from "@/components/shared/TableOfContents";

export const revalidate = 21600; // MLB_ISR_SECONDS (Next.js 16 Turbopack: literal required)

const TOTAL = MLB_FACTOR_COUNTS.total;
const TITLE_EN = "MLB Prediction Methodology | MoneyBall Score";
const SUMMARY_EN = `How MoneyBall Score builds MLB game predictions — data sources, ${TOTAL}-factor quantitative model, verification method, and how it differs from the KBO model.`;

const TOC_ITEMS = [
  { id: "principles", label: "Core Principles" },
  { id: "data-sources", label: "Data Sources" },
  { id: "model", label: "Quantitative Model" },
  { id: "verification", label: "Verification" },
  { id: "limits", label: "Limits & Disclaimer" },
];

export const metadata: Metadata = {
  title: TITLE_EN,
  description: SUMMARY_EN,
  alternates: {
    canonical: `${SITE_URL}/en/mlb/methodology`,
    languages: { en: `${SITE_URL}/en/mlb/methodology`, ko: `${SITE_URL}/mlb/methodology` },
  },
  openGraph: {
    title: TITLE_EN,
    description: SUMMARY_EN,
    url: `${SITE_URL}/en/mlb/methodology`,
    type: "article",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_EN,
    description: SUMMARY_EN,
  },
};

export default function MlbMethodologyEnPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "MLB Prediction Methodology",
    description: SUMMARY_EN,
    url: `${SITE_URL}/en/mlb/methodology`,
    author: { "@type": "Organization", name: "MoneyBall Score" },
    about: { "@type": "Thing", name: "MLB sabermetrics prediction methodology" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/en/mlb/methodology` },
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb
        items={[{ href: "/en/mlb", label: "MLB Analysis" }, { label: "Methodology" }]}
        locale="en"
      />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">MLB Prediction Methodology</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          The full process behind our MLB game predictions, published without omission.
        </p>
      </header>

      <TableOfContents title="Contents" items={TOC_ITEMS} />

      <section id="principles" className="space-y-3 scroll-mt-20">
        <h2 className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2">
          Core Principles
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          MLB predictions run on a <strong>pure quantitative model</strong>. Unlike KBO, which combines
          sabermetric factors with an AI judge-agent debate layer, MLB skips the LLM debate layer entirely — at
          30 teams / 435 possible matchups the scale doesn&apos;t fit a daily per-game debate — and derives win
          probability purely from a weighted sum of {TOTAL} quantitative factors (single{" "}
          <code>scoring_rule=&apos;{MLB_SCORING_RULE}&apos;</code> version, no agent re-judging confidence day to
          day).
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          Every factor comes from public data sources only. Full weights and rationale are published on the{" "}
          <Link href="/en/mlb/factors" className="text-brand-600 dark:text-brand-300 hover:underline">
            {TOTAL}-factor model
          </Link>{" "}
          page.
        </p>
      </section>

      <section id="data-sources" className="space-y-3 scroll-mt-20">
        <h2 className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2">
          Data Sources
        </h2>
        <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-2 list-disc pl-5">
          <li>
            <strong>MLB Stats API</strong> (statsapi.mlb.com) — schedule, results, recent form, head-to-head.
            Official live data.
          </li>
          <li>
            <strong>Baseball Savant</strong> (Statcast) — xwOBA, Barrel%, starter xwOBA-against, wOBA standard
            deviation. Batted-ball quality from launch angle and exit velocity — an MLB-only layer with no KBO
            equivalent.
          </li>
          <li>
            <strong>FanGraphs MLB</strong> — starter/bullpen FIP·xFIP, lineup wOBA, WAR, defensive SFR.
          </li>
        </ul>
      </section>

      <section id="model" className="space-y-3 scroll-mt-20">
        <h2 className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2">
          Quantitative Model
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          The {TOTAL}-factor model is the 10 KBO-equivalent factors (FIP, xFIP, wOBA, bullpen FIP, recent form,
          WAR, head-to-head, park factor, Elo, defensive SFR) plus 4 Statcast-only factors. Team Elo ratings
          aren&apos;t sourced externally like KBO&apos;s — we run our own K-factor update loop (<code>K={MLB_ELO_K}</code>,{" "}
          <code>K={MLB_ELO_K_POSTSEASON}</code> in the postseason, values cited from FiveThirtyEight&apos;s published
          MLB Elo model) after every game. Home teams get the same empirically measured home-field bonus as KBO
          (+{HOME_ADVANTAGE_PCT.toFixed(1)}pp).
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          Full weight table, definitions, and sources are on{" "}
          <Link href="/en/mlb/factors" className="text-brand-600 dark:text-brand-300 hover:underline">
            /en/mlb/factors
          </Link>
          .
        </p>
      </section>

      <section id="verification" className="space-y-3 scroll-mt-20">
        <h2 className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2">
          Verification
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          Every prediction is auto-scored after the game ends and published live on{" "}
          <Link href="/en/mlb/accuracy" className="text-brand-600 dark:text-brand-300 hover:underline">
            /en/mlb/accuracy
          </Link>
          . We publish Brier score (a calibration measure) and a calibration chart alongside raw accuracy, so
          overconfidence shows up transparently rather than getting hidden behind a single win-rate number.
        </p>
      </section>

      <section id="limits" className="space-y-3 scroll-mt-20">
        <h2 className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2">
          Limits & Disclaimer
        </h2>
        <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-2 list-disc pl-5">
          <li>The MLB model has run for a shorter period than KBO, so its sample size is smaller.</li>
          <li>Without an LLM debate layer, qualitative context like injuries or trades isn&apos;t factored in.</li>
          <li>These predictions are informational content only, not betting or investment advice.</li>
        </ul>
      </section>
    </main>
  );
}
