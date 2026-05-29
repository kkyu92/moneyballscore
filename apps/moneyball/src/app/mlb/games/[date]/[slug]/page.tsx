import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = "https://moneyballscore.vercel.app";

interface PageParams {
  params: Promise<{ date: string; slug: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { date, slug } = await params;
  return {
    title: `${slug} ${date} 분석 | MoneyBall Score`,
    description: `${slug} 14팩터 + Statcast 4 + waterfall`,
    alternates: {
      canonical: `${SITE_URL}/mlb/games/${date}/${slug}`,
      languages: { 'en': `${SITE_URL}/en/mlb/games/${date}/${slug}`, 'ko': `${SITE_URL}/mlb/games/${date}/${slug}` },
    },
  };
}

export default async function GameDetail({ params }: PageParams) {
  const { date, slug } = await params;
  const [home, away] = slug.split('-vs-');
  if (!home || !away) notFound();

  const supabase = await createClient();
  const { data: pred } = await supabase
    .from('predictions')
    .select('*')
    .eq('league', 'mlb')
    .eq('game_date', date)
    .eq('home_team_code', home)
    .eq('away_team_code', away)
    .single();

  if (!pred) notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumb items={[
        { label: 'MLB 분석', href: '/mlb' },
        { label: date, href: `/mlb/games/${date}` },
        { label: `${home} vs ${away}` },
      ]} />

      <h1 className="text-2xl md:text-3xl font-bold">
        {home} vs {away}
      </h1>

      <section className="rounded-lg bg-brand-50 dark:bg-brand-900 p-5">
        <div className="text-3xl font-bold text-brand-700 dark:text-brand-100">
          {pred.predicted_winner} {Math.round(pred.confidence * 100)}%
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">14 factor breakdown</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <FactorRow label="선발 FIP" home={pred.home_sp_fip} away={pred.away_sp_fip} />
          <FactorRow label="타선 wOBA" home={pred.home_lineup_woba} away={pred.away_lineup_woba} />
          <FactorRow label="타선 xwOBA" home={pred.home_lineup_xwoba} away={pred.away_lineup_xwoba} />
          <FactorRow label="Barrel%" home={pred.home_lineup_barrel_pct} away={pred.away_lineup_barrel_pct} />
        </dl>
      </section>
    </main>
  );
}

function FactorRow({ label, home, away }: { label: string; home: number | null; away: number | null }) {
  return (
    <div className="border border-brand-200 dark:border-brand-800 rounded p-3">
      <dt className="text-xs text-brand-500">{label}</dt>
      <dd className="font-mono mt-1">{home ?? '—'} / {away ?? '—'}</dd>
    </div>
  );
}
