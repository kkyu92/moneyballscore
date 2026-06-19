import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { createClient } from "@/lib/supabase/server";
import { assertSelectOk } from "@moneyball/shared";
import { MetricRegistry, type MetricSlug } from "@moneyball/kbo-data";

export const revalidate = 1800;

const SITE_URL = "https://moneyballscore.vercel.app";

interface PageParams {
  params: Promise<{ date: string; slug: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { date, slug } = await params;
  const title = `${slug} ${date} 분석 | MoneyBall Score`;
  const description = `${slug} 14팩터 + Statcast 4 + waterfall`;
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/mlb/games/${date}/${slug}`,
      languages: { 'en': `${SITE_URL}/en/mlb/games/${date}/${slug}`, 'ko': `${SITE_URL}/mlb/games/${date}/${slug}` },
    },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: "MoneyBall Score",
      title,
      description,
      url: `${SITE_URL}/mlb/games/${date}/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

interface PredictionDetailRow {
  game_id: number;
  predicted_winner: number | null;
  confidence: number | null;
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_lineup_woba: number | null;
  away_lineup_woba: number | null;
  home_lineup_xwoba: number | null;
  away_lineup_xwoba: number | null;
  home_lineup_barrel_pct: number | null;
  away_lineup_barrel_pct: number | null;
  games: {
    game_date: string;
    home_team: { code: string | null } | null;
    away_team: { code: string | null } | null;
  } | null;
  predicted_winner_team: { code: string | null } | null;
}

export default async function GameDetail({ params }: PageParams) {
  const { date, slug } = await params;
  const [home, away] = slug.split('-vs-');
  if (!home || !away) notFound();

  const supabase = await createClient();
  const result = await supabase
    .from('predictions')
    .select(`
      game_id,
      predicted_winner,
      confidence,
      home_sp_fip,
      away_sp_fip,
      home_lineup_woba,
      away_lineup_woba,
      home_lineup_xwoba,
      away_lineup_xwoba,
      home_lineup_barrel_pct,
      away_lineup_barrel_pct,
      games!inner(
        game_date,
        home_team:teams!games_home_team_id_fkey(code),
        away_team:teams!games_away_team_id_fkey(code)
      ),
      predicted_winner_team:teams!predictions_predicted_winner_fkey(code)
    `)
    .eq('league', 'mlb')
    .eq('games.game_date', date)
    .eq('games.home_team.code', home)
    .eq('games.away_team.code', away)
    .maybeSingle();

  const { data: predRaw } = assertSelectOk(result, 'MlbGameDetail prediction');
  const pred = predRaw as unknown as PredictionDetailRow | null;

  if (!pred) notFound();

  const winnerCode = pred.predicted_winner_team?.code ?? '?';
  const conf = pred.confidence != null ? Math.round(pred.confidence * 100) : 0;

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumb items={[
        { label: 'MLB 분석', href: '/mlb' },
        { label: date, href: `/mlb/games/${date}` },
        { label: `${home} vs ${away}` },
      ]} />

      <h1 className="text-2xl md:text-3xl font-bold text-brand-700 dark:text-brand-100">
        {home} vs {away}
      </h1>

      <section className="rounded-lg bg-brand-50 dark:bg-brand-900 p-5">
        <div className="text-3xl font-bold text-brand-700 dark:text-brand-100">
          {winnerCode} {conf}%
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3 text-brand-700 dark:text-brand-100">14 factor breakdown</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <FactorRow slug="sp_fip" home={pred.home_sp_fip} away={pred.away_sp_fip} />
          <FactorRow slug="lineup_woba" home={pred.home_lineup_woba} away={pred.away_lineup_woba} />
          <FactorRow label="타선 xwOBA" home={pred.home_lineup_xwoba} away={pred.away_lineup_xwoba} />
          <FactorRow label="Barrel%" home={pred.home_lineup_barrel_pct} away={pred.away_lineup_barrel_pct} />
        </dl>
      </section>
    </main>
  );
}

function FactorRow({
  slug,
  label,
  home,
  away,
}: {
  slug?: MetricSlug;
  label?: string;
  home: number | null;
  away: number | null;
}) {
  const resolved = slug ? MetricRegistry[slug].ko_name : label;
  return (
    <div className="border border-brand-200 dark:border-brand-800 rounded p-3">
      <dt className="text-xs text-brand-500 dark:text-brand-400">{resolved}</dt>
      <dd className="font-mono mt-1 text-brand-700 dark:text-brand-100">{home ?? '—'} / {away ?? '—'}</dd>
    </div>
  );
}
