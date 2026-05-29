import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = "https://moneyballscore.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `MLB ${date} 경기 예측 | MoneyBall Score`,
    description: `${date} MLB 경기 14팩터 분석 + 예측 confidence`,
    alternates: {
      canonical: `${SITE_URL}/mlb/games/${date}`,
      languages: { 'en': `${SITE_URL}/en/mlb/games/${date}`, 'ko': `${SITE_URL}/mlb/games/${date}` },
    },
  };
}

export default async function MlbGames({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^20[2-9]\d-\d{2}-\d{2}$/.test(date)) notFound();

  const supabase = await createClient();
  const { data: predictions } = await supabase
    .from('predictions')
    .select('game_id, predicted_winner, confidence, home_team_code, away_team_code')
    .eq('league', 'mlb')
    .eq('game_date', date)
    .order('game_id', { ascending: true });

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumb items={[
        { label: 'MLB 분석', href: '/mlb' },
        { label: date },
      ]} />

      <h1 className="text-2xl md:text-3xl font-bold text-brand-700 dark:text-brand-100">
        MLB {date} 경기
      </h1>

      {!predictions || predictions.length === 0 ? (
        <p className="text-brand-500">해당 일자 경기 박제 X</p>
      ) : (
        <ul className="space-y-3">
          {predictions.map((p) => (
            <li key={p.game_id} className="rounded-lg border border-brand-200 dark:border-brand-800 p-4 hover:border-brand-400 transition-colors">
              <Link href={`/mlb/games/${date}/${p.home_team_code}-vs-${p.away_team_code}`} className="flex items-center justify-between">
                <span className="font-semibold">
                  {p.home_team_code} vs {p.away_team_code}
                </span>
                <span className="text-sm text-brand-600 dark:text-brand-300">
                  {p.predicted_winner} {Math.round(p.confidence * 100)}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
