import type { Metadata } from "next";
import Link from "next/link";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { MLB_TEAM_COUNT, MLB_DIVISION_COUNT, MLB_GAMES_PER_TEAM, MLB_SCORING_RULE, SITE_URL, ACCURACY_OK_PCT } from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { LanguageSwitch } from "@/components/shared/LanguageSwitch";
import { createClient } from "@/lib/supabase/server";
import { buildMlbAccuracySummary } from "@/lib/mlb/buildMlbAccuracySummary";

export const revalidate = 1800; // MLB_LIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

const TOTAL = MLB_FACTOR_COUNTS.total;
const KBO_N = MLB_FACTOR_COUNTS.kbo;
const STAT_N = MLB_FACTOR_COUNTS.statcast;

export const metadata: Metadata = {
  title: `MLB Analysis — ${TOTAL}-Factor Sabermetrics + Statcast | MoneyBall Score`,
  description: `MLB ${MLB_TEAM_COUNT}-team ${MLB_GAMES_PER_TEAM}-game analysis with a ${TOTAL}-factor model (KBO ${KBO_N} + Statcast ${STAT_N}). Data-driven win predictions in Korean and English.`,
  alternates: {
    canonical: `${SITE_URL}/en/mlb`,
    languages: { en: `${SITE_URL}/en/mlb`, ko: `${SITE_URL}/mlb` },
  },
  openGraph: {
    title: "MLB Analysis | MoneyBall Score",
    description: `MLB ${MLB_GAMES_PER_TEAM}-game analysis + ${TOTAL}-factor model + Statcast`,
    url: `${SITE_URL}/en/mlb`,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB Analysis | MoneyBall Score",
    description: `MLB ${MLB_GAMES_PER_TEAM}-game analysis + ${TOTAL}-factor model + Statcast`,
  },
};

export default async function MlbHubEn() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const accuracy = await buildMlbAccuracySummary('en');

  // MLB predictions have game_id=NULL (migration 038) — games!inner join is
  // KBO-only and always mismatches (silent 0, cycle 2114 fix-incident). Filter
  // directly on mlb_game_date instead.
  const result = await supabase
    .from('predictions')
    .select('external_game_id')
    .eq('league', 'mlb')
    .eq('scoring_rule', MLB_SCORING_RULE)
    .eq('mlb_game_date', today);

  const todayGames = result.error ? null : result.data;
  if (result.error) {
    console.warn(`[MlbHubEn] predictions query failed: ${result.error.message}`);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Breadcrumb items={[{ label: "MLB Analysis" }]} locale="en" />
        <LanguageSwitch koHref="/mlb" enHref="/en/mlb" current="en" />
      </div>

      <section className="text-center space-y-3 py-6">
        <h1 className="text-3xl md:text-5xl font-bold text-brand-700 dark:text-brand-100">
          MLB Analysis
        </h1>
        <p className="text-base text-brand-600 dark:text-brand-300">
          {MLB_GAMES_PER_TEAM}-game season analysis · {TOTAL}-factor model (KBO {KBO_N} + Statcast {STAT_N}) · data-driven weights
        </p>
      </section>

      {accuracy.verifiedN > 0 && (
        <section className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-bold text-brand-700 dark:text-brand-100">Model Accuracy</h2>
            <p className="text-xs text-brand-500">{accuracy.verifiedN} games verified</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg border border-brand-200 dark:border-brand-800 p-3 text-center">
              <p className="text-xs text-brand-500 mb-1">Overall Accuracy</p>
              <p
                className={`text-2xl font-bold ${
                  accuracy.accuracyRate !== null && accuracy.accuracyRate * 100 >= ACCURACY_OK_PCT
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {accuracy.accuracyRate !== null ? `${Math.round(accuracy.accuracyRate * 100)}%` : "—"}
              </p>
              <p className="text-[11px] text-brand-400 mt-1">{accuracy.correctN}/{accuracy.verifiedN}</p>
            </div>
            <div className="rounded-lg border border-brand-200 dark:border-brand-800 p-3 text-center">
              <p className="text-xs text-brand-500 mb-1">Brier Score</p>
              <p className="text-2xl font-bold text-brand-700 dark:text-brand-100">
                {accuracy.brier !== null ? accuracy.brier.toFixed(3) : "—"}
              </p>
              <p className="text-[11px] text-brand-400 mt-1">Lower is better</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {accuracy.confidenceTiers.map((tier) => {
              const pct = tier.accuracy !== null ? Math.round(tier.accuracy * 100) : null;
              return (
                <div key={tier.label} className="rounded-lg border border-brand-200 dark:border-brand-800 p-3 text-center">
                  <p className="text-[11px] text-brand-500">{tier.label}</p>
                  <p className="text-[10px] text-brand-400">{tier.range}</p>
                  <p className="text-lg font-bold text-brand-700 dark:text-brand-100 mt-1">
                    {pct !== null ? `${pct}%` : "—"}
                  </p>
                  <p className="text-[10px] text-brand-400">{tier.n > 0 ? `${tier.hits}/${tier.n}` : "No data"}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid md:grid-cols-3 gap-4">
        <Link href={`/en/mlb/games/${today}`} className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">Today&apos;s Games ({todayGames?.length ?? 0})</h3>
          <p className="text-xs text-brand-500 mt-1">{TOTAL}-factor + prediction confidence</p>
        </Link>
        <Link href="/en/mlb/standings" className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">Team Standings</h3>
          <p className="text-xs text-brand-500 mt-1">AL/NL {MLB_DIVISION_COUNT} divisions</p>
        </Link>
        <Link href="/en/mlb/accuracy" className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">AI Track Record</h3>
          <p className="text-xs text-brand-500 mt-1">Accuracy · Brier · calibration · per-team</p>
        </Link>
        <Link href="/en/mlb/players" className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">Statcast Deep-Dive</h3>
          <p className="text-xs text-brand-500 mt-1">xwOBA / Barrel% / Launch Angle</p>
        </Link>
        <Link href="/en/mlb/wild-card" className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-5">
          <h3 className="font-bold text-amber-700 dark:text-amber-200">⭐ Wild Card Race</h3>
          <p className="text-xs text-amber-600 mt-1">ETA 2026-08</p>
        </Link>
        <Link href="/en/mlb/postseason" className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-5">
          <h3 className="font-bold text-amber-700 dark:text-amber-200">⭐ Postseason Bracket</h3>
          <p className="text-xs text-amber-600 mt-1">ETA 2026-09</p>
        </Link>
        <Link href="/en/mlb/factors" className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">{TOTAL}-Factor Model</h3>
          <p className="text-xs text-brand-500 mt-1">Weights + home-field advantage</p>
        </Link>
        <Link href="/en/mlb/calendar" className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">Monthly Calendar</h3>
          <p className="text-xs text-brand-500 mt-1">Daily prediction count + accuracy heatmap</p>
        </Link>
      </section>
    </main>
  );
}
