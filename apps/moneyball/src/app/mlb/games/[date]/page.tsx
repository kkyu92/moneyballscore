import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import {SITE_URL } from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 1800; // MLB_LIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  const title = `MLB ${date} 경기 예측 | MoneyBall Score`;
  const description = `${date} MLB 경기 ${MLB_FACTOR_COUNTS.total}팩터 분석 + 예측 confidence`;
  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/mlb/games/${date}`,
      languages: { 'en': `${SITE_URL}/en/mlb/games/${date}`, 'ko': `${SITE_URL}/mlb/games/${date}` },
    },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: "MoneyBall Score",
      title,
      description,
      url: `${SITE_URL}/mlb/games/${date}`,
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

export default async function MlbGames({ params }: { params: Promise<{ date: string }> }) {
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

  // MLB backend migrations 033-037 적용 완료. query 에러 시 fallback.
  if (result.error) {
    console.warn(`[MlbGames] predictions query failed: ${result.error.message}`);
  }
  const rows: PredictionRow[] = result.error
    ? []
    : (result.data ?? []) as unknown as PredictionRow[];

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumb items={[
        { label: 'MLB 분석', href: '/mlb' },
        { label: date },
      ]} />

      <h1 className="text-2xl md:text-3xl font-bold text-brand-700 dark:text-brand-100">
        MLB {date} 경기
      </h1>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/50 p-6 space-y-3">
          <p className="text-brand-600 dark:text-brand-300">해당 일자 MLB 경기가 없습니다.</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/mlb"
              className="inline-flex items-center gap-1 rounded-md border border-brand-300 dark:border-brand-700 px-3 py-1.5 text-sm hover:border-brand-500 transition-colors"
            >
              MLB 분석 hub
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-md border border-brand-300 dark:border-brand-700 px-3 py-1.5 text-sm hover:border-brand-500 transition-colors"
            >
              오늘 KBO 분석
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
                <Link href={`/mlb/games/${date}/${homeCode}-vs-${awayCode}`} className="flex items-center justify-between">
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
