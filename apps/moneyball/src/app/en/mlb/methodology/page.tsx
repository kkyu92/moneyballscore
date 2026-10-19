import type { Metadata } from "next";
import Link from "next/link";
import { MLB_BASE_WEIGHTS, MLB_FACTOR_COUNTS, MLB_PLACEHOLDER_FACTOR_KEYS, MLB_ELO_K } from "@moneyball/kbo-data";
import {
  SITE_URL,
  MLB_SCORING_RULE,
  HOME_ELO_BONUS,
  ELO_DIVIDER,
  MLB_TEAM_COUNT,
  MLB_HEAD_TO_HEAD_PAIRS,
} from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TableOfContents } from "@/components/shared/TableOfContents";

export const revalidate = 21600; // MLB_ISR_SECONDS (Next.js 16 Turbopack: literal required)

const TOTAL = MLB_FACTOR_COUNTS.total;
// Single source: MLB_PLACEHOLDER_FACTOR_KEYS (mlb-base.ts) — same array the KO page and /mlb/factors use.
const PLACEHOLDER_WEIGHT_SUM_PCT = Math.round(
  MLB_PLACEHOLDER_FACTOR_KEYS.reduce((sum, key) => sum + MLB_BASE_WEIGHTS[key], 0) * 100,
);
// MLB home advantage is NOT a single fixed constant like KBO's HOME_ADVANTAGE_PCT (+1.5pp) —
// it's the sum of (1) HOME_ELO_BONUS baked into the elo factor's weight and (2) a separate
// flat home_elo_bonus weight applied at half value (computeMlbProbability, mlb-base.ts). At a
// fully neutral matchup the two sum to the pipeline's documented 0.556 constant (cycle 2057
// pre-fix value, see mlb-pipeline.ts comment) — the old "same +1.5pp as KBO" claim here did
// not match the actual mlb-base.ts logic (cycle 3247 fix).
const HOME_ELO_EMBEDDED_PCT = MLB_BASE_WEIGHTS.elo * (HOME_ELO_BONUS / ELO_DIVIDER) * 100;
const HOME_FLAT_BONUS_PCT = MLB_BASE_WEIGHTS.home_elo_bonus * 0.5 * 100;
const HOME_NEUTRAL_TOTAL_PCT = (HOME_ELO_EMBEDDED_PCT + HOME_FLAT_BONUS_PCT).toFixed(1);
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
          {MLB_TEAM_COUNT} teams / {MLB_HEAD_TO_HEAD_PAIRS} possible matchups the scale doesn&apos;t fit a daily per-game debate — and derives win
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
            <strong>FanGraphs MLB</strong> — starter/bullpen FIP·xFIP, lineup wOBA, WAR. Defensive SFR has no
            MLB-specific source yet and is a neutral placeholder (see Limits section below).
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
          same value for every game including postseason, cited from FiveThirtyEight&apos;s published
          MLB Elo model) after every game. Home-field advantage isn&apos;t a single fixed value like KBO&apos;s —
          it&apos;s the sum of a home Elo bonus ({HOME_ELO_BONUS} Elo) baked into the elo factor, plus a separate
          flat home_elo_bonus weight. At a fully neutral matchup (every factor tied) the two sum to about{" "}
          +{HOME_NEUTRAL_TOTAL_PCT}pp — structurally larger than KBO&apos;s single measured constant (+1.5pp).
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          Note: defensive SFR, starter xwOBA-against, and wOBA standard deviation (
          {PLACEHOLDER_WEIGHT_SUM_PCT}% combined) are shown for reference on team/matchup
          pages, but since no MLB-specific data source exists for them yet, a neutral
          team-agnostic value is fixed in the win-probability calculation above — they
          don&apos;t actually move the number. Recent form, head-to-head, and Elo are all
          real measured values feeding into the calculation. Starter FIP and bullpen FIP also
          currently share the same team-level FIP number (no starter-specific FIP source yet) —
          they&apos;re two weighted copies of one measurement, not independent inputs, until a
          dedicated source is added (KBO&apos;s version keeps starter/bullpen fully separate).
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
