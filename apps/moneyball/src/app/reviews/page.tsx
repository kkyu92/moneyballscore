import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  type TeamCode,
  shortTeamName,
  winnerProbOf,
  assertSelectOk, REVIEWS_RECENT_LIMIT, SITE_URL,
  FACTOR_PICK_STRONG, FACTOR_PICK_COMPLETE, CONVERGENCE_RECORD_ALL_LIMIT,
  REVIEWS_HUB_RECENT_WEEKS, REVIEWS_HUB_RECENT_MONTHS,
  KBO_SEASON_YEAR, UPCOMING_CONVERGENCE_TEAM_LIMIT,
} from '@moneyball/shared';
import Link from "next/link";
import { getRecentWeeks } from "@/lib/reviews/computeWeekRange";
import { getRecentMonths } from "@/lib/reviews/computeMonthRange";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { ReviewsResultFilter } from "@/components/reviews/ReviewsResultFilter";
import { CURRENT_MODEL_FILTER } from "@/config/model";
import { accuracyRateColorClass } from "@/lib/accuracy/buildAccuracyData";
import { getRecentConvergencePickRecord, getConvergencePickStreak, getConvergencePickBestStreak, getConvergencePickTeamStats, getConvergencePickHomeAwaySplit, getConvergencePickDayOfWeekSplit, computeWinRatePct, computeWinRateColorClass } from '@/lib/analysis/convergenceRecord';

// wave-599: 요일 인덱스(0=일~6=토) → 한글 라벨
const WEEKDAY_LABELS_KO = ['일', '월', '화', '수', '목', '금', '토'];

export const metadata: Metadata = {
  title: "예측 결과 리뷰",
  description: "KBO 승부예측 적중 vs 빗나간 결과 리뷰 — 주간·월간·전체 시즌 적중률 추이, 팀별·요일별 분해, 빗나간 예측의 사후 분석을 한 페이지에서 확인.",
  alternates: { canonical: `${SITE_URL}/reviews` },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: `${SITE_URL}/reviews`,
    siteName: "MoneyBall Score",
    title: "예측 결과 리뷰 | MoneyBall Score",
    description: "KBO 승부예측 적중 vs 빗나간 결과 리뷰 — 주간·월간·전체 시즌 적중률 추이.",
  },
  twitter: {
    card: "summary_large_image",
    title: "예측 결과 리뷰 | MoneyBall Score",
    description: "KBO 승부예측 적중 vs 빗나간 결과 리뷰.",
  },
};

export const revalidate = 600; // REVIEWS_INDEX_ISR_SECONDS (Next.js 16 Turbopack: literal required)

interface VerifiedPredictionRow {
  confidence: number;
  is_correct: boolean | null;
  prediction_type: string;
  reasoning: { homeWinProb?: number | null } | null;
  predicted_winner_team: { code: string | null; name_ko: string | null } | null;
  game: {
    id: number;
    game_date: string;
    game_time: string | null;
    home_score: number | null;
    away_score: number | null;
    status: string | null;
    home_team: { code: string | null; name_ko: string | null } | null;
    away_team: { code: string | null; name_ko: string | null } | null;
  } | null;
}

async function getVerifiedPredictions(): Promise<VerifiedPredictionRow[]> {
  const supabase = await createClient();

  // assertSelectOk — DB 오류 시 data=null silent fallback → 빈 배열 위장 →
  // "아직 검증된 예측이 없습니다" 가짜 노출 + 적중률 0% silent 0/0 차단.
  // fail-loud → error.tsx boundary 처리.
  const result = await supabase
    .from('predictions')
    .select(`
      confidence, is_correct, prediction_type, reasoning,
      predicted_winner_team:teams!predictions_predicted_winner_fkey(code, name_ko),
      game:games!predictions_game_id_fkey(
        id, game_date, game_time, home_score, away_score, status,
        home_team:teams!games_home_team_id_fkey(code, name_ko),
        away_team:teams!games_away_team_id_fkey(code, name_ko)
      )
    `)
    .match(CURRENT_MODEL_FILTER)
    .eq('prediction_type', 'pre_game')
    .not('is_correct', 'is', null)
    .order('created_at', { ascending: false })
    .limit(REVIEWS_RECENT_LIMIT);

  const { data } = assertSelectOk(result, "reviews getVerifiedPredictions");
  return (data ?? []) as unknown as VerifiedPredictionRow[];
}

export default async function ReviewsPage() {
  const [
    predictions,
    strongConvergenceRecord,
    completeConvergenceRecord,
    strongConvergenceStreak,
    bestConvergenceStreak,
    completeConvergenceStreak,
    completeBestStreak,
    strongTeamStats,
    completeTeamStats,
    strongHomeAwaySplit,
    completeHomeAwaySplit,
    strongDayOfWeekSplit,
    completeDayOfWeekSplit,
  ] = await Promise.all([
    getVerifiedPredictions(),
    getRecentConvergencePickRecord(CONVERGENCE_RECORD_ALL_LIMIT, FACTOR_PICK_STRONG),
    getRecentConvergencePickRecord(CONVERGENCE_RECORD_ALL_LIMIT, FACTOR_PICK_COMPLETE),
    // wave-592: 강수렴 픽 현재 streak + 시즌 최장 streak
    getConvergencePickStreak(FACTOR_PICK_STRONG),
    getConvergencePickBestStreak(),
    // wave-592: 완전수렴 픽 현재 streak + 시즌 최장 streak
    getConvergencePickStreak(FACTOR_PICK_COMPLETE),
    getConvergencePickBestStreak(FACTOR_PICK_COMPLETE),
    // wave-596: 강수렴/완전수렴 픽 팀별 시즌 성적 (analysis/page.tsx wave-557 재사용)
    getConvergencePickTeamStats(FACTOR_PICK_STRONG),
    getConvergencePickTeamStats(FACTOR_PICK_COMPLETE),
    // wave-597: 강수렴/완전수렴 픽 홈/어웨이 분리 성적 (analysis/page.tsx wave-559/573 재사용)
    getConvergencePickHomeAwaySplit(FACTOR_PICK_STRONG),
    getConvergencePickHomeAwaySplit(FACTOR_PICK_COMPLETE),
    // wave-599: 강수렴/완전수렴 픽 요일별 분리 성적 — 페이지 metadata "팀별·요일별 분해" 미구현분 충족
    getConvergencePickDayOfWeekSplit(FACTOR_PICK_STRONG),
    getConvergencePickDayOfWeekSplit(FACTOR_PICK_COMPLETE),
  ]);
  const recentWeeks = getRecentWeeks(REVIEWS_HUB_RECENT_WEEKS);
  const recentMonths = getRecentMonths(REVIEWS_HUB_RECENT_MONTHS);

  const total = predictions.length;
  const correct = predictions.filter((p) => p.is_correct).length;
  const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "예측 결과 리뷰",
    description:
      "KBO 승부예측 적중 vs 빗나간 결과 리뷰 — 주간·월간·전체 시즌 적중률 추이.",
    url: `${SITE_URL}/reviews`,
    inLanguage: "ko-KR",
    mainEntity: {
      "@type": "Dataset",
      name: "KBO 승부예측 검증 데이터셋",
      description: `검증 완료 ${total}건 · 적중 ${correct}건 · 적중률 ${rate}%`,
      variableMeasured: ["적중", "실패", "신뢰도", "팀별 적중률"],
      isAccessibleForFree: true,
      keywords: ["KBO", "승부예측", "적중률", "세이버메트릭스"],
    },
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb items={[{ label: '예측 결과 리뷰' }]} />
      <div>
        <h1 className="text-3xl font-bold">예측 결과 리뷰</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          AI 예측의 적중과 실패를 경기별로 추적합니다.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-gradient-to-r from-brand-500/5 to-accent/5 dark:from-brand-500/10 dark:to-accent/10 rounded-xl border border-brand-500/20 p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                📅 주간 리뷰
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                매주 하이라이트 · 팀별 성과 · 팩터 인사이트
              </p>
            </div>
            <Link
              href={`/reviews/weekly/${recentWeeks[recentWeeks.length - 1].weekId}`}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              이번 주 →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentWeeks.map((w) => (
              <Link
                key={w.weekId}
                href={`/reviews/weekly/${w.weekId}`}
                className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                {w.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-accent/5 to-brand-500/5 dark:from-accent/10 dark:to-brand-500/10 rounded-xl border border-accent/30 p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                📆 월간 리뷰
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                전월 대비 diff · 팀 순위 · 팩터 장기 트렌드
              </p>
            </div>
            <Link
              href={`/reviews/monthly/${recentMonths[recentMonths.length - 1].monthId}`}
              className="text-sm font-medium text-accent hover:underline"
            >
              이번 달 →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentMonths.map((m) => (
              <Link
                key={m.monthId}
                href={`/reviews/monthly/${m.monthId}`}
                className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-accent hover:text-accent transition-colors"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </div>

        <Link
          href="/reviews/misses"
          className="group bg-gradient-to-r from-red-500/5 to-orange-500/5 dark:from-red-500/10 dark:to-orange-500/10 rounded-xl border border-red-500/20 p-5 flex flex-col justify-between hover:border-red-500/50 transition-colors"
        >
          <div>
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              🧭 회고 · 크게 빗나간 예측
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              고확신 실패 사례의 사후 분석. 편향 지목 팩터와 놓친 것 공개.
            </p>
          </div>
          <span className="text-sm font-medium text-red-600 dark:text-red-400 mt-3 group-hover:underline self-start">
            회고 보기 →
          </span>
        </Link>
      </section>

      {/* wave-590: 수렴 픽 전체 성적 — 강수렴/완전수렴 누적 W-L 카드 */}
      {(strongConvergenceRecord.total > 0 || completeConvergenceRecord.total > 0) && (
        <section aria-labelledby="reviews-convergence-title" className="space-y-3">
          <h2 id="reviews-convergence-title" className="text-lg font-bold">
            수렴 픽 전체 성적
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {strongConvergenceRecord.total > 0 && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-brand-500/30 p-5 space-y-1">
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide">강수렴 픽</p>
                <p className="text-2xl font-bold">
                  {strongConvergenceRecord.wins}승 {strongConvergenceRecord.losses}패
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {strongConvergenceRecord.total}경기 ·{' '}
                  {computeWinRatePct(strongConvergenceRecord.wins, strongConvergenceRecord.total)}% 적중
                </p>
              </div>
            )}
            {completeConvergenceRecord.total > 0 && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-amber-500/40 p-5 space-y-1">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">★ 완전수렴 픽</p>
                <p className="text-2xl font-bold">
                  {completeConvergenceRecord.wins}승 {completeConvergenceRecord.losses}패
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {completeConvergenceRecord.total}경기 ·{' '}
                  {computeWinRatePct(completeConvergenceRecord.wins, completeConvergenceRecord.total)}% 적중
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* wave-592: 수렴 픽 스트리크 — 강수렴/완전수렴 현재 + 시즌 최장 카드 */}
      {(strongConvergenceStreak !== null || completeConvergenceStreak !== null) && (
        <section aria-labelledby="reviews-streak-title" className="space-y-3">
          <h2 id="reviews-streak-title" className="text-lg font-bold">
            수렴 픽 스트리크
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 강수렴 픽 스트리크 */}
            {strongConvergenceStreak !== null && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-brand-500/30 p-5 space-y-1">
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide">강수렴 픽 현재</p>
                <p className={`text-2xl font-bold ${strongConvergenceStreak.type === 'win' ? 'text-amber-500 dark:text-amber-400' : 'text-sky-500 dark:text-sky-400'}`}>
                  {strongConvergenceStreak.type === 'win' ? '🔥' : '❄️'}{' '}
                  {strongConvergenceStreak.length}연{strongConvergenceStreak.type === 'win' ? '승' : '패'}
                </p>
                {bestConvergenceStreak !== null && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {KBO_SEASON_YEAR} 최장 {bestConvergenceStreak.length}연{bestConvergenceStreak.type === 'win' ? '승' : '패'}
                  </p>
                )}
              </div>
            )}
            {/* 완전수렴 픽 스트리크 */}
            {completeConvergenceStreak !== null && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-amber-500/40 p-5 space-y-1">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">★ 완전수렴 픽 현재</p>
                <p className={`text-2xl font-bold ${completeConvergenceStreak.type === 'win' ? 'text-amber-600 dark:text-amber-400' : 'text-sky-500 dark:text-sky-400'}`}>
                  {completeConvergenceStreak.type === 'win' ? '🔥' : '❄️'}{' '}
                  {completeConvergenceStreak.length}연{completeConvergenceStreak.type === 'win' ? '승' : '패'}
                </p>
                {completeBestStreak !== null && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {KBO_SEASON_YEAR} 최장 {completeBestStreak.length}연{completeBestStreak.type === 'win' ? '승' : '패'}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* wave-596: 수렴 픽 팀별 시즌 성적 배지 — 강수렴/완전수렴 (analysis/page.tsx wave-557 재사용) */}
      {(strongTeamStats.length > 0 || completeTeamStats.length > 0) && (
        <section aria-labelledby="reviews-team-stats-title" className="space-y-2">
          <h2 id="reviews-team-stats-title" className="text-lg font-bold">
            팀별 수렴 픽 성적
          </h2>
          {strongTeamStats.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">🏅 강수렴:</span>
              {strongTeamStats.slice(0, UPCOMING_CONVERGENCE_TEAM_LIMIT).map(stat => {
                const teamTotal = stat.wins + stat.losses;
                const pct = computeWinRatePct(stat.wins, teamTotal);
                return (
                  <span
                    key={`strong-${stat.teamCode}`}
                    className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60"
                    title={`${shortTeamName(stat.teamCode)}: ${stat.wins}승 ${stat.losses}패 (${pct}%) — 강수렴 픽 ${teamTotal}경기`}
                  >
                    <span className="font-medium text-gray-700 dark:text-gray-300">{shortTeamName(stat.teamCode)}</span>
                    <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>{pct}%</span>
                  </span>
                );
              })}
            </div>
          )}
          {completeTeamStats.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">★ 완전수렴:</span>
              {completeTeamStats.slice(0, UPCOMING_CONVERGENCE_TEAM_LIMIT).map(stat => {
                const teamTotal = stat.wins + stat.losses;
                const pct = computeWinRatePct(stat.wins, teamTotal);
                return (
                  <span
                    key={`complete-${stat.teamCode}`}
                    className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20"
                    title={`${shortTeamName(stat.teamCode)}: ${stat.wins}승 ${stat.losses}패 (${pct}%) — 완전수렴 픽 ${teamTotal}경기`}
                  >
                    <span className="font-medium text-amber-700 dark:text-amber-300">{shortTeamName(stat.teamCode)}</span>
                    <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>{pct}%</span>
                  </span>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* wave-597: 수렴 픽 홈/어웨이 분리 성적 배지 — 강수렴/완전수렴 (analysis/page.tsx wave-559/573 재사용) */}
      {(strongHomeAwaySplit !== null || completeHomeAwaySplit !== null) && (
        <section aria-labelledby="reviews-home-away-title" className="space-y-2">
          <h2 id="reviews-home-away-title" className="text-lg font-bold">
            홈/어웨이 지목 성적
          </h2>
          {strongHomeAwaySplit !== null && (() => {
            const homeTotal = strongHomeAwaySplit.home.wins + strongHomeAwaySplit.home.losses;
            const awayTotal = strongHomeAwaySplit.away.wins + strongHomeAwaySplit.away.losses;
            const homePct = computeWinRatePct(strongHomeAwaySplit.home.wins, homeTotal);
            const awayPct = computeWinRatePct(strongHomeAwaySplit.away.wins, awayTotal);
            return (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">🏅 강수렴:</span>
                <span
                  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60"
                  title={`홈팀 지목 ${homeTotal}경기: ${strongHomeAwaySplit.home.wins}승 ${strongHomeAwaySplit.home.losses}패 (${homePct}%)`}
                >
                  <span className="text-gray-500 dark:text-gray-400">🏠홈</span>
                  <span className={`tabular-nums font-medium ${computeWinRateColorClass(homePct)}`}>{homePct}%</span>
                  <span className="text-gray-400 dark:text-gray-500 tabular-nums">({homeTotal})</span>
                </span>
                <span
                  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60"
                  title={`어웨이팀 지목 ${awayTotal}경기: ${strongHomeAwaySplit.away.wins}승 ${strongHomeAwaySplit.away.losses}패 (${awayPct}%)`}
                >
                  <span className="text-gray-500 dark:text-gray-400">✈️원정</span>
                  <span className={`tabular-nums font-medium ${computeWinRateColorClass(awayPct)}`}>{awayPct}%</span>
                  <span className="text-gray-400 dark:text-gray-500 tabular-nums">({awayTotal})</span>
                </span>
              </div>
            );
          })()}
          {completeHomeAwaySplit !== null && (() => {
            const homeTotal = completeHomeAwaySplit.home.wins + completeHomeAwaySplit.home.losses;
            const awayTotal = completeHomeAwaySplit.away.wins + completeHomeAwaySplit.away.losses;
            const homePct = computeWinRatePct(completeHomeAwaySplit.home.wins, homeTotal);
            const awayPct = computeWinRatePct(completeHomeAwaySplit.away.wins, awayTotal);
            return (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">★ 완전수렴:</span>
                <span
                  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20"
                  title={`홈팀 지목 ${homeTotal}경기: ${completeHomeAwaySplit.home.wins}승 ${completeHomeAwaySplit.home.losses}패 (${homePct}%)`}
                >
                  <span className="text-amber-600 dark:text-amber-400">🏠홈</span>
                  <span className={`tabular-nums font-medium ${computeWinRateColorClass(homePct)}`}>{homePct}%</span>
                  <span className="text-gray-400 dark:text-gray-500 tabular-nums">({homeTotal})</span>
                </span>
                <span
                  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20"
                  title={`어웨이팀 지목 ${awayTotal}경기: ${completeHomeAwaySplit.away.wins}승 ${completeHomeAwaySplit.away.losses}패 (${awayPct}%)`}
                >
                  <span className="text-amber-600 dark:text-amber-400">✈️원정</span>
                  <span className={`tabular-nums font-medium ${computeWinRateColorClass(awayPct)}`}>{awayPct}%</span>
                  <span className="text-gray-400 dark:text-gray-500 tabular-nums">({awayTotal})</span>
                </span>
              </div>
            );
          })()}
        </section>
      )}

      {/* wave-599: 수렴 픽 요일별 분리 성적 배지 — 강수렴/완전수렴 (본 페이지 metadata "팀별·요일별 분해" 공약 충족) */}
      {(strongDayOfWeekSplit.length > 0 || completeDayOfWeekSplit.length > 0) && (
        <section aria-labelledby="reviews-day-of-week-title" className="space-y-2">
          <h2 id="reviews-day-of-week-title" className="text-lg font-bold">
            요일별 수렴 픽 성적
          </h2>
          {strongDayOfWeekSplit.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">🏅 강수렴:</span>
              {strongDayOfWeekSplit.map(stat => {
                const dayTotal = stat.wins + stat.losses;
                const pct = computeWinRatePct(stat.wins, dayTotal);
                return (
                  <span
                    key={`strong-day-${stat.dayIndex}`}
                    className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60"
                    title={`${WEEKDAY_LABELS_KO[stat.dayIndex]}요일: ${stat.wins}승 ${stat.losses}패 (${pct}%) — 강수렴 픽 ${dayTotal}경기`}
                  >
                    <span className="font-medium text-gray-700 dark:text-gray-300">{WEEKDAY_LABELS_KO[stat.dayIndex]}</span>
                    <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>{pct}%</span>
                  </span>
                );
              })}
            </div>
          )}
          {completeDayOfWeekSplit.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">★ 완전수렴:</span>
              {completeDayOfWeekSplit.map(stat => {
                const dayTotal = stat.wins + stat.losses;
                const pct = computeWinRatePct(stat.wins, dayTotal);
                return (
                  <span
                    key={`complete-day-${stat.dayIndex}`}
                    className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20"
                    title={`${WEEKDAY_LABELS_KO[stat.dayIndex]}요일: ${stat.wins}승 ${stat.losses}패 (${pct}%) — 완전수렴 픽 ${dayTotal}경기`}
                  >
                    <span className="font-medium text-amber-700 dark:text-amber-300">{WEEKDAY_LABELS_KO[stat.dayIndex]}</span>
                    <span className={`tabular-nums ${computeWinRateColorClass(pct)}`}>{pct}%</span>
                  </span>
                );
              })}
            </div>
          )}
        </section>
      )}

      {total > 0 ? (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">총 검증</p>
              <p className="text-3xl font-bold mt-1">{total}<span className="text-sm text-gray-400 dark:text-gray-500 ml-1">경기</span></p>
            </div>
            <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">적중</p>
              <p className="text-3xl font-bold text-brand-600 dark:text-brand-400 mt-1">{correct}<span className="text-sm text-gray-400 dark:text-gray-500 ml-1">경기</span></p>
            </div>
            <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">적중률</p>
              <p className={`text-3xl font-bold mt-1 ${accuracyRateColorClass(rate, true)}`}>
                {rate}%
              </p>
            </div>
          </div>

          {/* 결과 필터 */}
          <ReviewsResultFilter
            counts={{ all: total, correct, incorrect: total - correct }}
          />

          {/* 경기 목록 */}
          <div className="space-y-3">
            {predictions.map((pred, i) => {
              const game = pred.game;
              if (!game) return null;
              const homeCode = game.home_team?.code as TeamCode;
              const awayCode = game.away_team?.code as TeamCode;
              const homeName = shortTeamName(homeCode);
              const awayName = shortTeamName(awayCode);
              const winnerCode = pred.predicted_winner_team?.code as TeamCode;
              const winnerName = shortTeamName(winnerCode);
              const pct = Math.round(winnerProbOf(pred.reasoning?.homeWinProb) * 100);

              return (
                <Link
                  key={`${game.id}-${i}`}
                  href={`/analysis/game/${game.id}`}
                  data-review-result={pred.is_correct ? 'correct' : 'incorrect'}
                  className="flex items-center justify-between bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      pred.is_correct
                        ? 'bg-brand-500/15 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                      {pred.is_correct ? '적중' : '실패'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {awayName} {game.away_score ?? ''} : {game.home_score ?? ''} {homeName}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{game.game_date}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {winnerName} {pct}% 예측
                    </p>
                    <span className="text-xs text-gray-400 dark:text-gray-500">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-2xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center">
          <span className="text-5xl block mb-4">📊</span>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
            아직 검증된 예측이 없습니다
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            매일 KST 23:00에 경기 결과가 반영되면 여기서 적중/실패를 확인할 수 있습니다.
          </p>
          <Link href="/" className="inline-block mt-4 text-sm text-brand-600 hover:underline">
            오늘의 예측 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}
