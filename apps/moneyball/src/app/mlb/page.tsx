import type { Metadata } from "next";
import Link from "next/link";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { MLB_TEAM_COUNT, MLB_DIVISION_COUNT, MLB_GAMES_PER_TEAM, SITE_URL } from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { LanguageSwitch } from "@/components/shared/LanguageSwitch";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 1800; // MLB_LIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

const TOTAL = MLB_FACTOR_COUNTS.total;
const KBO_N = MLB_FACTOR_COUNTS.kbo;
const STAT_N = MLB_FACTOR_COUNTS.statcast;

export const metadata: Metadata = {
  title: `MLB 분석 — 세이버메트릭스 ${TOTAL}팩터 + Statcast | MoneyBall Score`,
  description: `MLB ${MLB_TEAM_COUNT}개 구단 ${MLB_GAMES_PER_TEAM}경기 분석 + ${TOTAL}팩터 모델 (KBO ${KBO_N} + Statcast ${STAT_N}) 기반 승부예측. 한국어/영어 페이지 제공.`,
  alternates: {
    canonical: `${SITE_URL}/mlb`,
    languages: { 'en': `${SITE_URL}/en/mlb`, 'ko': `${SITE_URL}/mlb` },
  },
  openGraph: {
    title: "MLB 분석 | MoneyBall Score",
    description: `MLB ${MLB_GAMES_PER_TEAM}경기 분석 + ${TOTAL}팩터 모델 + Statcast`,
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

  // MLB backend migrations 033-037 적용 완료. query 에러 시 fallback.
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
          {MLB_GAMES_PER_TEAM}경기 시즌 분석 · {TOTAL}팩터 모델 (KBO {KBO_N} + Statcast {STAT_N}) · 데이터 기반 학습 가중치
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <Link href={`/mlb/games/${today}`} className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">오늘 경기 ({todayGames?.length ?? 0})</h3>
          <p className="text-xs text-brand-500 mt-1">{TOTAL}팩터 + 예측 확률</p>
        </Link>
        <Link href="/mlb/standings" className="rounded-xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">팀 순위</h3>
          <p className="text-xs text-brand-500 mt-1">AL/NL {MLB_DIVISION_COUNT} 디비전</p>
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
          <h3 className="font-bold text-brand-700 dark:text-brand-100">{TOTAL}팩터 설명</h3>
          <p className="text-xs text-brand-500 mt-1">가중치 + 홈팀 어드밴티지</p>
        </Link>
      </section>
    </main>
  );
}
