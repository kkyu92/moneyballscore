import type { Metadata } from "next";
import {
  MLB_FACTOR_PICK_STRONG,
  MLB_FACTOR_PICK_COMPLETE,
  SITE_URL,
  mlbShortTeamName,
} from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConvergenceStreakBadges } from "@/components/reviews/ConvergenceStreakBadges";
import { ConvergenceTeamStatsBadges } from "@/components/reviews/ConvergenceTeamStatsBadges";
import { ConvergenceHomeAwayBadges } from "@/components/reviews/ConvergenceHomeAwayBadges";
import { ConvergenceDayOfWeekBadges } from "@/components/reviews/ConvergenceDayOfWeekBadges";
import {
  computeWinRatePct,
  getMlbRecentConvergencePickRecord,
  getMlbConvergencePickStreak,
  getMlbConvergencePickBestStreak,
  getMlbConvergencePickTeamStats,
  getMlbConvergencePickHomeAwaySplit,
  getMlbConvergencePickDayOfWeekSplit,
} from "@/lib/analysis/convergenceRecord";

// KBO /reviews 의 MLB 대응 (cycle 2226, Feature-Drift Cycle 후속) — MLB_NAV "경기·팀"
// 그룹에 예측 기록(/mlb/predictions)은 있었지만 수렴 픽 분석(팀별/홈-어웨이/요일별/스트리크)이
// 통째로 빠져있던 gap. 개별 경기 목록은 이미 /mlb/predictions 가 담당하므로 본 페이지는
// 수렴 픽 분석 허브에 집중 (Phase 1 — weekly/monthly 서브페이지는 MLB 주/월 range 유틸
// 부재라 후속 cycle 과제).
const PAGE_URL = `${SITE_URL}/mlb/reviews`;

export const metadata: Metadata = {
  title: "MLB 예측 결과 리뷰",
  description:
    "MLB 승부예측 수렴 픽 성적 리뷰 — 강수렴·완전수렴 픽 전체 성적, 스트리크, 팀별·홈/어웨이·요일별 분해.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: PAGE_URL,
    siteName: "MoneyBall Score",
    title: "MLB 예측 결과 리뷰 | MoneyBall Score",
    description: "MLB 승부예측 수렴 픽 성적 리뷰 — 강수렴·완전수렴 픽 전체 성적과 팀별 분해.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB 예측 결과 리뷰 | MoneyBall Score",
    description: "MLB 승부예측 수렴 픽 성적 리뷰.",
  },
};

export const revalidate = 1800; // MLB_LIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export default async function MlbReviewsPage() {
  const [
    strongConvergenceRecord,
    completeConvergenceRecord,
    strongConvergenceStreak,
    strongBestStreak,
    completeConvergenceStreak,
    completeBestStreak,
    strongTeamStats,
    completeTeamStats,
    strongHomeAwaySplit,
    completeHomeAwaySplit,
    strongDayOfWeekSplit,
    completeDayOfWeekSplit,
  ] = await Promise.all([
    getMlbRecentConvergencePickRecord(MLB_FACTOR_PICK_STRONG),
    getMlbRecentConvergencePickRecord(MLB_FACTOR_PICK_COMPLETE),
    getMlbConvergencePickStreak(MLB_FACTOR_PICK_STRONG),
    getMlbConvergencePickBestStreak(MLB_FACTOR_PICK_STRONG),
    getMlbConvergencePickStreak(MLB_FACTOR_PICK_COMPLETE),
    getMlbConvergencePickBestStreak(MLB_FACTOR_PICK_COMPLETE),
    getMlbConvergencePickTeamStats(MLB_FACTOR_PICK_STRONG),
    getMlbConvergencePickTeamStats(MLB_FACTOR_PICK_COMPLETE),
    getMlbConvergencePickHomeAwaySplit(MLB_FACTOR_PICK_STRONG),
    getMlbConvergencePickHomeAwaySplit(MLB_FACTOR_PICK_COMPLETE),
    getMlbConvergencePickDayOfWeekSplit(MLB_FACTOR_PICK_STRONG),
    getMlbConvergencePickDayOfWeekSplit(MLB_FACTOR_PICK_COMPLETE),
  ]);

  const hasAnyData = strongConvergenceRecord.total > 0 || completeConvergenceRecord.total > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "MLB 예측 결과 리뷰",
    description: "MLB 승부예측 수렴 픽 성적 리뷰 — 강수렴·완전수렴 픽 전체 성적, 스트리크, 팀별·홈/어웨이·요일별 분해.",
    url: PAGE_URL,
    inLanguage: "ko-KR",
    mainEntity: {
      "@type": "Dataset",
      name: "MLB 승부예측 수렴 픽 검증 데이터셋",
      description: `강수렴 ${strongConvergenceRecord.total}건 · 완전수렴 ${completeConvergenceRecord.total}건`,
      variableMeasured: ["적중", "실패", "팀별 적중률", "홈/어웨이 적중률", "요일별 적중률"],
      isAccessibleForFree: true,
      keywords: ["MLB", "승부예측", "적중률", "세이버메트릭스"],
    },
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb items={[{ label: 'MLB 분석', href: '/mlb' }, { label: '예측 결과 리뷰' }]} />
      <div>
        <h1 className="text-3xl font-bold">MLB 예측 결과 리뷰</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          강수렴·완전수렴 픽의 전체 성적과 스트리크, 팀별·홈/어웨이·요일별 분해입니다.
        </p>
      </div>

      {hasAnyData ? (
        <>
          {/* 수렴 픽 전체 성적 */}
          <section aria-labelledby="mlb-reviews-convergence-title" className="space-y-3">
            <h2 id="mlb-reviews-convergence-title" className="text-lg font-bold">
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

          <ConvergenceStreakBadges
            titleId="mlb-reviews-streak-title"
            strongStreak={strongConvergenceStreak}
            strongBestStreak={strongBestStreak}
            completeStreak={completeConvergenceStreak}
            completeBestStreak={completeBestStreak}
          />

          <ConvergenceTeamStatsBadges
            titleId="mlb-reviews-team-stats-title"
            strongTeamStats={strongTeamStats}
            completeTeamStats={completeTeamStats}
            nameResolver={mlbShortTeamName}
          />

          <ConvergenceHomeAwayBadges
            titleId="mlb-reviews-home-away-title"
            strongSplit={strongHomeAwaySplit}
            completeSplit={completeHomeAwaySplit}
          />

          <ConvergenceDayOfWeekBadges
            titleId="mlb-reviews-day-of-week-title"
            strongSplit={strongDayOfWeekSplit}
            completeSplit={completeDayOfWeekSplit}
          />
        </>
      ) : (
        <EmptyState
          title="아직 검증된 수렴 픽이 없습니다."
          description="파이프라인이 실행되면 자동으로 데이터가 채워집니다."
        />
      )}
    </div>
  );
}
