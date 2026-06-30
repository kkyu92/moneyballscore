import type { Metadata } from "next";
import Link from "next/link";
import { MLB_BASE_WEIGHTS, MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { V2_PROMOTION_COHORT_N, HOME_ADVANTAGE_PCT, RECENT_FORM_GAMES, HOME_ELO_BONUS, SITE_URL } from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export const revalidate = 21600; // MLB_ISR_SECONDS (Next.js 16 Turbopack: literal required)

const TOTAL = MLB_FACTOR_COUNTS.total;
const KBO_N = MLB_FACTOR_COUNTS.kbo;
const STAT_N = MLB_FACTOR_COUNTS.statcast;
const TITLE_EN = `MLB ${TOTAL} Model Factors Weights | MoneyBall Score`;
const SUMMARY_EN = `KBO ${KBO_N} + Statcast ${STAT_N} = ${TOTAL}-factor MLB prediction model weight table.`;

export const metadata: Metadata = {
  title: `MLB ${TOTAL} Model Factors — Weights + Descriptions + Sources | MoneyBall Score`,
  description:
    `MLB ${TOTAL}-factor model weight table — KBO ${KBO_N} (FIP · xFIP · wOBA · Bullpen FIP · Recent Form · WAR · H2H · Park Factor · Elo · Defense SFR) + Statcast ${STAT_N} (xwOBA · Barrel% · xwOBA-against · wOBA std). Each factor defined with source and application method.`,
  alternates: {
    canonical: `${SITE_URL}/en/mlb/factors`,
    languages: {
      en: `${SITE_URL}/en/mlb/factors`,
      ko: `${SITE_URL}/mlb/factors`,
    },
  },
  openGraph: {
    title: TITLE_EN,
    description: SUMMARY_EN,
    url: `${SITE_URL}/en/mlb/factors`,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_EN,
    description: SUMMARY_EN,
  },
};

type FactorRow = {
  key: keyof typeof MLB_BASE_WEIGHTS;
  label: string;
  shortLabel: string;
  category: "Starting" | "Lineup" | "Bullpen" | "Form" | "Record" | "Park" | "Rating" | "Defense" | "Statcast" | "Bonus";
  range: string;
  description: string;
  why: string;
  source: string;
};

const KBO_10_FACTORS: readonly FactorRow[] = [
  {
    key: "sp_fip",
    label: "SP FIP (Fielding Independent Pitching)",
    shortLabel: "SP FIP",
    category: "Starting",
    range: "1.50 ~ 6.00",
    description:
      "ERA estimated from strikeouts, walks, and home runs only — removes fielder influence to measure true pitcher skill. Lower is better.",
    why: `Starting pitcher matchup is the single biggest influence on a game — ranks #2 in ${TOTAL}-factor model weights.`,
    source: "FanGraphs MLB · KBO Fancy Stats",
  },
  {
    key: "sp_xfip",
    label: "SP xFIP",
    shortLabel: "SP xFIP",
    category: "Starting",
    range: "1.50 ~ 6.00",
    description:
      "FIP with home run component normalized to league-average HR/FB ratio. Removes HR luck to measure true contact suppression.",
    why: "Eliminates HR noise from FIP → more meaningful in small samples. Supplementary layer to FIP.",
    source: "FanGraphs MLB · KBO Fancy Stats",
  },
  {
    key: "lineup_woba",
    label: "Lineup wOBA (Weighted On-Base Average)",
    shortLabel: "Lineup wOBA",
    category: "Lineup",
    range: "0.250 ~ 0.420",
    description:
      "Weighted average of run values for BB / HBP / 1B / 2B / 3B / HR. More accurate measure of offensive production than OBP.",
    why: "Lineup production = scoring capacity per game. Tied with SP FIP for top weight in the model.",
    source: "FanGraphs MLB · KBO Fancy Stats",
  },
  {
    key: "bullpen_fip",
    label: "Bullpen FIP (Aggregate)",
    shortLabel: "Bullpen FIP",
    category: "Bullpen",
    range: "2.50 ~ 6.00",
    description:
      "Weighted average FIP for the team bullpen (all pitchers outside the starter). High leverage in later innings.",
    why: "Bullpen takes over after 5–6 innings — decisive in close games. High leverage factor.",
    source: "FanGraphs MLB · KBO Fancy Stats",
  },
  {
    key: "recent_form",
    label: `Recent Form (Last ${RECENT_FORM_GAMES} Games)`,
    shortLabel: "Recent Form",
    category: "Form",
    range: "-3 ~ +3",
    description:
      `Difference between last-${RECENT_FORM_GAMES} win rate and season win rate. ±0 = season baseline, +0.3 = strong hot streak.`,
    why: "Captures player condition, bullpen fatigue, lineup hot zones, and other daily variables. Fade-or-follow signal.",
    source: "statsapi.mlb.com (boxscore aggregate)",
  },
  {
    key: "war",
    label: "WAR (Wins Above Replacement)",
    shortLabel: "Team WAR",
    category: "Record",
    range: "-2 ~ +12 (per player)",
    description:
      "Wins a player contributes above a replacement-level player. Team lineup WAR sum = total season talent.",
    why: "Long-term talent base. While recent form is short-term, WAR is the long-term layer.",
    source: "FanGraphs MLB · KBO Fancy Stats",
  },
  {
    key: "head_to_head",
    label: "Head-to-Head (H2H)",
    shortLabel: "H2H",
    category: "Record",
    range: "0.00 ~ 1.00",
    description:
      "Win rate in direct matchups between the two teams this season. Captures matchup quirks (ballpark / rivalry / specific pitcher vs lineup).",
    why: "Small sample (~13–19 games per season) but preserves matchup-specific patterns. Weight capped at 3%.",
    source: "statsapi.mlb.com (schedule aggregate)",
  },
  {
    key: "park_factor",
    label: "Park Factor (PF)",
    shortLabel: "PF",
    category: "Park",
    range: "85 ~ 115",
    description:
      "Run environment at the home ballpark (hitter-friendly vs pitcher-friendly). Coors Field ~115 / Petco ~95. 100 = neutral.",
    why: "Home ballpark adaptation = one axis of home advantage. Supplements wOBA / FIP ballpark adjustments.",
    source: "FanGraphs MLB · ESPN Park Factor",
  },
  {
    key: "elo",
    label: "Elo Rating",
    shortLabel: "Elo",
    category: "Rating",
    range: "1300 ~ 1700",
    description:
      "Baseball adaptation of chess Elo — updates both team ratings after each game. Stabilizes after the second half of the season.",
    why: "Expresses team strength in a single metric. Information value Δ=+0.30 — highest among all factors (KBO backtest).",
    source: "KBO Fancy Stats Elo · MLB FiveThirtyEight Elo (legacy)",
  },
  {
    key: "defense_sfr",
    label: "Defense SFR (Skill-Free Runs)",
    shortLabel: "Defense SFR",
    category: "Defense",
    range: "-30 ~ +30 (team)",
    description:
      "Runs saved by defense. Positive = runs prevented above average; negative = runs allowed above average.",
    why: "Defense component missing from FIP — SFR fills that gap. Noisy in small samples.",
    source: "FanGraphs MLB Def · KBO Fancy Stats SFR",
  },
];

const STATCAST_4_FACTORS: readonly FactorRow[] = [
  {
    key: "lineup_xwoba",
    label: "Lineup xwOBA (Expected wOBA)",
    shortLabel: "Lineup xwOBA",
    category: "Statcast",
    range: "0.250 ~ 0.420",
    description:
      "Expected wOBA from launch angle + exit velocity. Removes luck (defense / ballpark / weather) to measure true contact quality.",
    why: `Eliminates result noise from wOBA → more meaningful in small samples. Top Statcast weight in the ${TOTAL}-factor model.`,
    source: "Baseball Savant (Statcast Era 2015~)",
  },
  {
    key: "lineup_barrel_pct",
    label: "Barrel %",
    shortLabel: "Barrel%",
    category: "Statcast",
    range: "0% ~ 25%",
    description:
      "Barrel = minimum launch angle + exit velocity threshold = avg .500+ AVG / 1.500+ SLG expected. Percentage per plate appearance.",
    why: "Hard contact frequency = raw signal for home run + extra-base production capacity.",
    source: "Baseball Savant (Barrel definition 2015 Tom Tango)",
  },
  {
    key: "sp_xwoba_against",
    label: "SP xwOBA-against",
    shortLabel: "SP xwOBA-a",
    category: "Statcast",
    range: "0.250 ~ 0.420",
    description:
      "xwOBA of batted balls allowed by the starting pitcher. Lower = better contact suppression. Complements FIP.",
    why: "Batted ball quality layer beyond FIP's K/BB/HR. Key pitcher-side Statcast factor.",
    source: "Baseball Savant (Statcast pitching)",
  },
  {
    key: "woba_std",
    label: "wOBA Standard Deviation (variance)",
    shortLabel: "wOBA σ",
    category: "Statcast",
    range: "0.020 ~ 0.080",
    description:
      "Standard deviation of wOBA across lineup batters. Low = balanced lineup; high = stars-and-scrubs.",
    why: "Measures lineup depth. Same average wOBA but different σ leads to different run distributions.",
    source: "FanGraphs MLB · KBO Fancy Stats",
  },
];

const HOME_BONUS: FactorRow = {
  key: "home_elo_bonus",
  label: "Home Advantage (Elo Bonus)",
  shortLabel: "Home Elo Bonus",
  category: "Bonus",
  range: `+${HOME_ELO_BONUS} Elo (~ +3.4%)`,
  description:
    `Elo bonus of ${HOME_ELO_BONUS} points added to the home team = ~+3.4% win probability (Elo 400-point conversion). Covers ballpark familiarity, travel fatigue differential, and crowd factor.`,
  why: "Quantifies home field advantage. Applied consistently to every game.",
  source: `FiveThirtyEight Elo (MLB) · KBO own measurement +${HOME_ADVANTAGE_PCT.toFixed(1)}%`,
};

function weightPercent(weight: number): string {
  return `${(weight * 100).toFixed(0)}%`;
}

function totalWeight(): number {
  return Object.values(MLB_BASE_WEIGHTS).reduce<number>((sum, w) => sum + w, 0);
}

export default function MlbFactorsHubEn() {
  const allFactors: FactorRow[] = [...KBO_10_FACTORS, ...STATCAST_4_FACTORS];
  const sum = totalWeight();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `MLB ${TOTAL}-Factor Model Weights + Descriptions`,
    description:
      `MLB ${TOTAL}-factor model = KBO ${KBO_N} + Statcast ${STAT_N}. Each factor's weight, definition, source, and application method.`,
    url: `${SITE_URL}/en/mlb/factors`,
    inLanguage: "en-US",
    author: { "@type": "Organization", name: "MoneyBall Score" },
    about: { "@type": "Thing", name: "MLB sabermetrics prediction model" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/en/mlb/factors` },
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
          { label: `${TOTAL} Model Factors` },
        ]}
        locale="en"
      />

      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">MLB {TOTAL} Model Factors</h1>
        <p className="text-gray-500 dark:text-gray-400">
          KBO {KBO_N} factors (FIP · xFIP · wOBA · Bullpen FIP · Recent Form · WAR · H2H · Park Factor · Elo · Defense SFR) +{" "}
          <Link href="/en/mlb/players" className="underline">
            Statcast {STAT_N}
          </Link>{" "}
          (xwOBA · Barrel% · xwOBA-against · wOBA σ) = {TOTAL} factors.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Weight total = {weightPercent(sum)} (including home bonus {weightPercent(MLB_BASE_WEIGHTS.home_elo_bonus)}). Weights defined in{" "}
          <code>packages/kbo-data/src/factors/mlb-base.ts</code>. Model will update after n={V2_PROMOTION_COHORT_N} forward cohort milestone.
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="weight-summary">
        <h2
          id="weight-summary"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          Weight Summary Table
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <tr>
                <th scope="col" className="text-left py-2 px-3">Factor</th>
                <th scope="col" className="text-left py-2 px-3">Category</th>
                <th scope="col" className="text-right py-2 px-3">Weight</th>
                <th scope="col" className="text-left py-2 px-3 hidden md:table-cell">Range</th>
              </tr>
            </thead>
            <tbody>
              {allFactors.map((f) => (
                <tr
                  key={f.key}
                  className="border-t border-gray-100 dark:border-[var(--color-border)] hover:bg-gray-50/50 dark:hover:bg-white/5"
                >
                  <td className="py-2 px-3 font-medium">
                    <a href={`#${f.key}`} className="hover:underline">
                      {f.shortLabel}
                    </a>
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400">{f.category}</td>
                  <td className="py-2 px-3 text-right font-mono">
                    {weightPercent(MLB_BASE_WEIGHTS[f.key])}
                  </td>
                  <td className="py-2 px-3 hidden md:table-cell text-xs text-gray-400 dark:text-gray-500">
                    {f.range}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 dark:border-[var(--color-border)] font-semibold">
                <td className="py-2 px-3" colSpan={2}>
                  {HOME_BONUS.shortLabel}{" "}
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">({HOME_BONUS.range})</span>
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {weightPercent(MLB_BASE_WEIGHTS.home_elo_bonus)}
                </td>
                <td className="py-2 px-3 hidden md:table-cell text-xs text-gray-400 dark:text-gray-500">
                  Bonus
                </td>
              </tr>
              <tr className="border-t-2 border-gray-400 dark:border-[var(--color-border)] font-bold">
                <td className="py-2 px-3" colSpan={2}>Total</td>
                <td className="py-2 px-3 text-right font-mono">{weightPercent(sum)}</td>
                <td className="hidden md:table-cell" />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-6" aria-labelledby="kbo-10-heading">
        <h2
          id="kbo-10-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          KBO {KBO_N} Factors (Equivalent)
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          The {KBO_N} factors from KBO model v1.8 mapped directly to the MLB domain. Only the data sources change — statsapi.mlb / FanGraphs MLB instead of KBO sources.
        </p>
        <ol className="space-y-4">
          {KBO_10_FACTORS.map((factor, idx) => (
            <li
              key={factor.key}
              id={factor.key}
              className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] p-4 space-y-2 scroll-mt-20"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-bold text-brand-700 dark:text-brand-100">
                  {idx + 1}. {factor.label}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200 shrink-0 font-mono">
                  {weightPercent(MLB_BASE_WEIGHTS[factor.key])}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Category: {factor.category} · range {factor.range}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-200">{factor.description}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Why it matters:</span> {factor.why}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Source: {factor.source}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-6" aria-labelledby="statcast-4-heading">
        <h2
          id="statcast-4-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          Statcast {STAT_N} Factors (MLB-exclusive layer)
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Batted-ball measurement layer available from the MLB Statcast Era (2015~) — {STAT_N} factors not present in the KBO model. Detailed team measurements ={" "}
          <Link href="/en/mlb/players" className="underline">
            /en/mlb/players
          </Link>
          .
        </p>
        <ol className="space-y-4">
          {STATCAST_4_FACTORS.map((factor, idx) => (
            <li
              key={factor.key}
              id={factor.key}
              className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] p-4 space-y-2 scroll-mt-20"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-bold text-brand-700 dark:text-brand-100">
                  {idx + 11}. {factor.label}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 shrink-0 font-mono">
                  {weightPercent(MLB_BASE_WEIGHTS[factor.key])}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Category: {factor.category} · range {factor.range}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-200">{factor.description}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Why it matters:</span> {factor.why}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Source: {factor.source}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3" aria-labelledby="bonus-heading">
        <h2
          id="bonus-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          Home Advantage Bonus
        </h2>
        <div
          id={HOME_BONUS.key}
          className="rounded-xl bg-amber-50/30 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/40 p-4 space-y-2 scroll-mt-20"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-bold text-amber-800 dark:text-amber-200">{HOME_BONUS.label}</h3>
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 shrink-0 font-mono">
              {weightPercent(MLB_BASE_WEIGHTS.home_elo_bonus)}
            </span>
          </div>
          <p className="text-xs text-amber-700/70 dark:text-amber-300/70">
            range {HOME_BONUS.range}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-200">{HOME_BONUS.description}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Why it matters:</span> {HOME_BONUS.why}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Source: {HOME_BONUS.source}
          </p>
        </div>
      </section>

      <footer className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[var(--color-border)] pt-4 space-y-1">
        <p>
          ※ These weights = MLB v1.0 (KBO v1.8 mapping + Statcast {STAT_N} additions). Will update when model evolves.
        </p>
        <p>
          ※ Weight source: <code>packages/kbo-data/src/factors/mlb-base.ts</code>. Shadow C learning cohort = walk-forward expanding window (milestones n=27 / 60 / 150 / 300 / 1000 / 2430).
        </p>
        <p>
          ※ KBO model = <Link href="/methodology" className="underline">/methodology</Link>. Statcast team measurements ={" "}
          <Link href="/en/mlb/players" className="underline">/en/mlb/players</Link>.
        </p>
      </footer>
    </main>
  );
}
