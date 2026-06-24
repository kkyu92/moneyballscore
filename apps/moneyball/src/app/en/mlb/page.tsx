import type { Metadata } from "next";
import Link from "next/link";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { MLB_TEAM_COUNT, MLB_DIVISION_COUNT, MLB_LIVE_ISR_SECONDS } from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { LanguageSwitch } from "@/components/shared/LanguageSwitch";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 1800;

const SITE_URL = "https://moneyballscore.vercel.app";

const TOTAL = MLB_FACTOR_COUNTS.total;
const KBO_N = MLB_FACTOR_COUNTS.kbo;
const STAT_N = MLB_FACTOR_COUNTS.statcast;

export const metadata: Metadata = {
  title: `MLB Analysis — ${TOTAL}-Factor Sabermetrics + Statcast | MoneyBall Score`,
  description: `MLB ${MLB_TEAM_COUNT}-team 162-game analysis with a ${TOTAL}-factor model (KBO ${KBO_N} + Statcast ${STAT_N}). Data-driven win predictions in Korean and English.`,
  alternates: {
    canonical: `${SITE_URL}/en/mlb`,
    languages: { en: `${SITE_URL}/en/mlb`, ko: `${SITE_URL}/mlb` },
  },
  openGraph: {
    title: "MLB Analysis | MoneyBall Score",
    description: `MLB 162-game analysis + ${TOTAL}-factor model + Statcast`,
    url: `${SITE_URL}/en/mlb`,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB Analysis | MoneyBall Score",
    description: `MLB 162-game analysis + ${TOTAL}-factor model + Statcast`,
  },
};

export default async function MlbHubEn() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const result = await supabase
    .from('predictions')
    .select(`
      game_id,
      games!inner(game_date, league)
    `)
    .eq('league', 'mlb')
    .eq('games.game_date', today)
    .order('game_id', { ascending: true });

  // MLB backend migrations (033 league column / 034 statcast factors / 035-037)
  // prod not yet applied (033 broken index transaction rollback). fix-incident heavy
  // cycle will fix migrations. Hub renders 0-game fallback for 200 status in the meantime.
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
          162-game season analysis · {TOTAL}-factor model (KBO {KBO_N} + Statcast {STAT_N}) · data-driven weights
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <Link href={`/en/mlb/games/${today}`} className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">Today&apos;s Games ({todayGames?.length ?? 0})</h3>
          <p className="text-xs text-brand-500 mt-1">{TOTAL}-factor + prediction confidence</p>
        </Link>
        <Link href="/en/mlb/standings" className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">Team Standings</h3>
          <p className="text-xs text-brand-500 mt-1">AL/NL {MLB_DIVISION_COUNT} divisions</p>
        </Link>
        <Link href="/en/mlb/players" className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
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
        <Link href="/en/mlb/factors" className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">{TOTAL}-Factor Model</h3>
          <p className="text-xs text-brand-500 mt-1">Weights + home-field advantage</p>
        </Link>
      </section>
    </main>
  );
}
