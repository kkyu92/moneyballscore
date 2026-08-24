import type { Metadata } from "next";
import Link from "next/link";
import {
  SITE_URL,
  mlbShortTeamName,
  REVIEWS_HUB_RECENT_WEEKS,
  REVIEWS_HUB_RECENT_MONTHS,
  SMALL_SAMPLE_N,
} from "@moneyball/shared";
import { getRecentWeeks } from "@/lib/reviews/computeWeekRange";
import { getRecentMonths } from "@/lib/reviews/computeMonthRange";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConvergenceStreakBadges } from "@/components/reviews/ConvergenceStreakBadges";
import { ConvergenceTeamStatsBadges } from "@/components/reviews/ConvergenceTeamStatsBadges";
import { ConvergenceHomeAwayBadges } from "@/components/reviews/ConvergenceHomeAwayBadges";
import { ConvergenceDayOfWeekBadges } from "@/components/reviews/ConvergenceDayOfWeekBadges";
import { computeWinRatePct } from "@/lib/analysis/convergenceRecord";
import { getMlbReviewsData } from "./reviews-data";

// KBO /reviews 의 MLB 대응 (cycle 2226, Feature-Drift Cycle 후속) — MLB_NAV "경기·팀"
// 그룹에 예측 기록(/mlb/predictions)은 있었지만 수렴 픽 분석(팀별/홈-어웨이/요일별/스트리크)이
// 통째로 빠져있던 gap. 개별 경기 목록은 이미 /mlb/predictions 가 담당하므로 본 페이지는
// 수렴 픽 분석 허브에 집중 (Phase 1 — weekly/monthly 서브페이지 수렴 픽 섹션은 cycle 2345
// 에서 MLB convergence 함수에 date-range 파라미터를 추가해 완결).
const PAGE_URL = `${SITE_URL}/mlb/reviews`;

export const metadata: Metadata = {
  title: "MLB 예측 결과 리뷰",
  description:
    "MLB 승부예측 수렴 픽 성적 리뷰 — 강수렴·완전수렴 픽 전체 성적, 스트리크, 팀별·홈/어웨이·요일별 분해.",
  alternates: { canonical: PAGE_URL, languages: { en: `${SITE_URL}/en/mlb/reviews` } },
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
  // reviews/page.tsx(KBO) 의 주간/월간 진입 카드 대응 (plan #26 Phase 2) — weekly(Phase 1b)
  // 도 hub 진입 링크가 누락돼 있었어서 이번 Phase 2 fire 에서 함께 추가.
  const recentWeeks = getRecentWeeks(REVIEWS_HUB_RECENT_WEEKS);
  const recentMonths = getRecentMonths(REVIEWS_HUB_RECENT_MONTHS);

  const {
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
    hasAnyData,
  } = await getMlbReviewsData();

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

      <section aria-labelledby="mlb-reviews-periodic-title" className="grid gap-4 md:grid-cols-2">
        <h2 id="mlb-reviews-periodic-title" className="sr-only">
          주간/월간 리뷰
        </h2>
        <div className="bg-gradient-to-r from-brand-500/5 to-accent/5 dark:from-brand-500/10 dark:to-accent/10 rounded-xl border border-brand-500/20 p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                📅 주간 리뷰
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                매주 하이라이트 · 팀별 성과 · 팩터 인사이트
              </p>
            </div>
            <Link
              href={`/mlb/reviews/weekly/${recentWeeks[recentWeeks.length - 1].weekId}`}
              className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              이번 주 →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentWeeks.map((w) => (
              <Link
                key={w.weekId}
                href={`/mlb/reviews/weekly/${w.weekId}`}
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
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                📆 월간 리뷰
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                전월 대비 diff · 팀별 통계 · 팩터 인사이트
              </p>
            </div>
            <Link
              href={`/mlb/reviews/monthly/${recentMonths[recentMonths.length - 1].monthId}`}
              className="text-sm font-medium text-accent hover:underline"
            >
              이번 달 →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentMonths.map((m) => (
              <Link
                key={m.monthId}
                href={`/mlb/reviews/monthly/${m.monthId}`}
                className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-accent hover:text-accent transition-colors"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </div>

        <Link
          href="/mlb/reviews/misses"
          className="group bg-gradient-to-r from-red-500/5 to-orange-500/5 dark:from-red-500/10 dark:to-orange-500/10 rounded-xl border border-red-500/20 p-5 flex flex-col justify-between hover:border-red-500/50 transition-colors"
        >
          <div>
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              🧭 회고 · 크게 빗나간 예측
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              고확신 실패 사례 모음. (틀린) 예측을 뒷받침했던 팩터 공개.
            </p>
          </div>
          <span className="text-sm font-medium text-red-600 dark:text-red-400 mt-3 group-hover:underline self-start">
            회고 보기 →
          </span>
        </Link>
      </section>

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
                    {strongConvergenceRecord.total < SMALL_SAMPLE_N && ` · 소표본(n<${SMALL_SAMPLE_N})`}
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
                    {completeConvergenceRecord.total < SMALL_SAMPLE_N && ` · 소표본(n<${SMALL_SAMPLE_N})`}
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
