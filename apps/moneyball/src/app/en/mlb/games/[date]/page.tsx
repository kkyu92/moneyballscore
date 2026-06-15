import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 1800;

const SITE_URL = "https://moneyballscore.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  const title = `MLB Games — ${date} Predictions | MoneyBall Score`;
  const description = `${date} MLB game predictions using 14-factor analysis + confidence scores.`;
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/en/mlb/games/${date}`,
      languages: { en: `${SITE_URL}/en/mlb/games/${date}`, ko: `${SITE_URL}/mlb/games/${date}` },
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

interface PredictionRow {
  game_id: number;
  predicted_winner: number | null;
  confidence: number | null;
  games: {
    game_date: string;
    home_team: { code: string | null } | null;
    away_team: { code: string | null } | null;
  } | null;
  predicted_winner_team: { code: string | null } | null;
}

export default async function MlbGamesEn({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^20[2-9]\d-\d{2}-\d{2}$/.test(date)) notFound();

  const supabase = await createClient();
  const result = await supabase
    .from('predictions')
    .select(`
      game_id,
      predicted_winner,
      confidence,
      games!inner(
        game_date,
        home_team:teams!games_home_team_id_fkey(code),
        away_team:teams!games_away_team_id_fkey(code)
      ),
      predicted_winner_team:teams!predictions_predicted_winner_fkey(code)
    `)
    .eq('league', 'mlb')
    .eq('games.game_date', date)
    .order('game_id', { ascending: true });

  // MLB backend migrations not yet applied — query failure falls back to empty render (cycle 1149).
  if (result.error) {
    console.warn(`[MlbGamesEn] predictions query failed: ${result.error.message}`);
  }
  const rows: PredictionRow[] = result.error
    ? []
    : (result.data ?? []) as unknown as PredictionRow[];

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumb items={[
        { label: 'MLB Analysis', href: '/en/mlb' },
        { label: date },
      ]} locale="en" />

      <h1 className="text-2xl md:text-3xl font-bold text-brand-700 dark:text-brand-100">
        MLB Games — {date}
      </h1>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/50 p-6 space-y-3">
          <p className="text-brand-600 dark:text-brand-300">No MLB games found for this date.</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/en/mlb"
              className="inline-flex items-center gap-1 rounded-md border border-brand-300 dark:border-brand-700 px-3 py-1.5 text-sm hover:border-brand-500 transition-colors"
            >
              MLB Analysis Hub
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-md border border-brand-300 dark:border-brand-700 px-3 py-1.5 text-sm hover:border-brand-500 transition-colors"
            >
              Today&apos;s KBO Analysis
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const homeCode = p.games?.home_team?.code ?? '?';
            const awayCode = p.games?.away_team?.code ?? '?';
            const winnerCode = p.predicted_winner_team?.code ?? '?';
            const conf = p.confidence != null ? Math.round(p.confidence * 100) : 0;
            return (
              <li key={p.game_id} className="rounded-lg border border-brand-200 dark:border-brand-800 p-4 hover:border-brand-400 transition-colors">
                <Link href={`/en/mlb/games/${date}/${homeCode}-vs-${awayCode}`} className="flex items-center justify-between">
                  <span className="font-semibold">
                    {homeCode} vs {awayCode}
                  </span>
                  <span className="text-sm text-brand-600 dark:text-brand-300">
                    {winnerCode} {conf}%
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
