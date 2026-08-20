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
  const accuracy = await buildMlbAccuracySummary();

  // MLB 예측은 game_id=NULL(migration 038) — games!inner 조인은 KBO 전용이라
  // 항상 미스매치(silent 0건, cycle 2114 fix-incident). mlb_game_date 로 직접 필터.
  const result = await supabase
    .from('predictions')
    .select('external_game_id')
    .eq('league', 'mlb')
    .eq('scoring_rule', MLB_SCORING_RULE)
    .eq('mlb_game_date', today);

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

      {accuracy.verifiedN > 0 && (
        <section className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-bold text-brand-700 dark:text-brand-100">모델 적중률</h2>
            <p className="text-xs text-brand-500">검증 {accuracy.verifiedN}경기</p>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg border border-brand-200 dark:border-brand-800 p-3 text-center">
              <p className="text-xs text-brand-500 mb-1">전체 적중률</p>
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
              <p className="text-[11px] text-brand-400 mt-1">낮을수록 정밀</p>
            </div>
            <Link
              href="/accuracy"
              className="rounded-lg border border-brand-200 dark:border-brand-800 p-3 text-center flex flex-col items-center justify-center hover:border-brand-400 transition-colors"
            >
              <p className="text-xs text-brand-500">KBO 상세 대시보드</p>
              <p className="text-sm font-semibold text-brand-600 dark:text-brand-400 mt-1">/accuracy →</p>
            </Link>
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
                  <p className="text-[10px] text-brand-400">{tier.n > 0 ? `${tier.hits}/${tier.n}` : "데이터 없음"}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid md:grid-cols-3 gap-4">
        <Link href={`/mlb/games/${today}`} className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">오늘 경기 ({todayGames?.length ?? 0})</h3>
          <p className="text-xs text-brand-500 mt-1">{TOTAL}팩터 + 예측 확률</p>
        </Link>
        <Link href="/mlb/standings" className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">팀 순위</h3>
          <p className="text-xs text-brand-500 mt-1">AL/NL {MLB_DIVISION_COUNT} 디비전</p>
        </Link>
        <Link href="/mlb/accuracy" className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">AI 적중 기록</h3>
          <p className="text-xs text-brand-500 mt-1">정확도·Brier·캘리브레이션·팀별 적중률</p>
        </Link>
        <Link href="/mlb/players" className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">Statcast deep-dive</h3>
          <p className="text-xs text-brand-500 mt-1">xwOBA / Barrel% / Launch Angle</p>
        </Link>
        <Link href="/mlb/wild-card" className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">Wild Card race</h3>
          <p className="text-xs text-brand-500 mt-1">실시간 순위 + GB + 매직넘버</p>
        </Link>
        <Link href="/mlb/postseason" className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-5">
          <h3 className="font-bold text-amber-700 dark:text-amber-200">⭐ Postseason bracket</h3>
          <p className="text-xs text-amber-600 mt-1">ETA 2026-09</p>
        </Link>
        <Link href="/mlb/factors" className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">{TOTAL}팩터 설명</h3>
          <p className="text-xs text-brand-500 mt-1">가중치 + 홈팀 어드밴티지</p>
        </Link>
        <Link href="/mlb/calendar" className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-brand-200 dark:border-brand-800 p-5 hover:border-brand-400 transition-colors">
          <h3 className="font-bold text-brand-700 dark:text-brand-100">월별 캘린더</h3>
          <p className="text-xs text-brand-500 mt-1">일별 예측 수 + 적중률 히트맵</p>
        </Link>
      </section>
    </main>
  );
}
