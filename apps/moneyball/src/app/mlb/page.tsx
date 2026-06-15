import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { LanguageSwitch } from "@/components/shared/LanguageSwitch";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 1800;

const SITE_URL = "https://moneyballscore.vercel.app";

export const metadata: Metadata = {
  title: "MLB 분석 — 세이버메트릭스 14팩터 + Statcast | MoneyBall Score",
  description: "MLB 162game 풀 인제스트 + 14팩터 (KBO 10 + Statcast 4) + Brier 측정. 영문 페이지 박제. Telegram MLB combined 알림.",
  alternates: {
    canonical: `${SITE_URL}/mlb`,
    languages: { 'en': `${SITE_URL}/en/mlb`, 'ko': `${SITE_URL}/mlb` },
  },
  openGraph: {
    title: "MLB 분석 정식 ship | MoneyBall Score",
    description: "MLB 162game 풀 인제스트 + 14팩터 + Statcast",
    url: `${SITE_URL}/mlb`,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default async function MlbHub() {
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
  // prod 미적용 상태 (033 broken index 트랜잭션 롤백). 별도 fix-incident heavy
  // cycle 에서 fix migration 박제. 그동안 hub 는 0 경기 fallback 으로 200 유지
  // (cycle 1149 사례 14 family 재발 fix — runtime-error-alert cron 10회 연속 fail).
  const todayGames = result.error ? null : result.data;
  if (result.error) {
    console.warn(`[MlbHub] predictions query failed: ${result.error.message}`);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Breadcrumb items={[{ label: "MLB 분석" }]} />
        <LanguageSwitch koHref="/mlb" enHref="/en/mlb" current="ko" />
      </div>

      <section className="text-center space-y-3 py-6">
        <h1 className="text-3xl md:text-5xl font-bold text-brand-700 dark:text-brand-100">
          MLB 분석
        </h1>
        <p className="text-base text-brand-600 dark:text-brand-300">
          162game 풀 인제스트 · 14팩터 본선 (KBO 10 + Statcast 4) · Shadow C 학습 weights
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <Link href={`/mlb/games/${today}`} className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">오늘 경기 ({todayGames?.length ?? 0})</h3>
          <p className="text-xs text-brand-500 mt-1">14팩터 + 예측 confidence</p>
        </Link>
        <Link href="/mlb/standings" className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">팀 standings</h3>
          <p className="text-xs text-brand-500 mt-1">AL/NL 6 division</p>
        </Link>
        <Link href="/mlb/players" className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">Statcast deep-dive</h3>
          <p className="text-xs text-brand-500 mt-1">xwOBA / Barrel% / Launch Angle</p>
        </Link>
        <Link href="/mlb/wild-card" className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-5">
          <h3 className="font-bold text-amber-700 dark:text-amber-200">⭐ Wild Card race</h3>
          <p className="text-xs text-amber-600 mt-1">ETA 2026-08</p>
        </Link>
        <Link href="/mlb/postseason" className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-5">
          <h3 className="font-bold text-amber-700 dark:text-amber-200">⭐ Postseason bracket</h3>
          <p className="text-xs text-amber-600 mt-1">ETA 2026-09</p>
        </Link>
        <Link href="/mlb/factors" className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">14 factor 설명</h3>
          <p className="text-xs text-brand-500 mt-1">가중치 + HOME_ELO_BONUS</p>
        </Link>
      </section>
    </main>
  );
}
