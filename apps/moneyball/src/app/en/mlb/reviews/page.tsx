import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, mlbShortTeamName } from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConvergenceStreakBadges } from "@/components/reviews/ConvergenceStreakBadges";
import { ConvergenceTeamStatsBadges } from "@/components/reviews/ConvergenceTeamStatsBadges";
import { ConvergenceHomeAwayBadges } from "@/components/reviews/ConvergenceHomeAwayBadges";
import { ConvergenceDayOfWeekBadges } from "@/components/reviews/ConvergenceDayOfWeekBadges";
import { getMlbReviewsData } from "@/app/mlb/reviews/reviews-data";
import { computeWinRatePct } from "@/lib/analysis/convergenceRecord";

// en/mlb/reviews (wave-659, cycle 2339) — KO /mlb/reviews 미러. weekly/monthly 서브페이지는
// EN 미러 부재(cycle 2226/2227 의도적 scope 축소, plan #26)라 index 진입 카드는 스코프 밖 —
// 수렴 픽 분석 허브 + 빗나간 예측(misses) 링크만 MVP 로 우선 배선 (analysis 미러 wave-658 동일 관례).
const PAGE_URL = `${SITE_URL}/en/mlb/reviews`;

export const metadata: Metadata = {
  title: "MLB Prediction Review — Convergence Pick Record | MoneyBall Score",
  description:
    "MLB prediction convergence pick review — strong/full convergence overall record, streaks, and breakdowns by team, home/away, and day of week.",
  alternates: {
    canonical: PAGE_URL,
    languages: { en: PAGE_URL, ko: `${SITE_URL}/mlb/reviews` },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: PAGE_URL,
    siteName: "MoneyBall Score",
    title: "MLB Prediction Review | MoneyBall Score",
    description: "MLB convergence pick record, streaks, and team breakdown.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB Prediction Review | MoneyBall Score",
    description: "MLB convergence pick review.",
  },
};

export const revalidate = 1800; // MLB_LIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export default async function MlbReviewsPageEn() {
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
    name: "MLB Prediction Review",
    description:
      "MLB prediction convergence pick review — strong/full convergence overall record, streaks, and breakdowns by team, home/away, and day of week.",
    url: PAGE_URL,
    inLanguage: "en-US",
    mainEntity: {
      "@type": "Dataset",
      name: "MLB Prediction Convergence Pick Validation Dataset",
      description: `Strong convergence: ${strongConvergenceRecord.total} games · Full convergence: ${completeConvergenceRecord.total} games`,
      variableMeasured: ["Win", "Loss", "Team accuracy", "Home/Away accuracy", "Day-of-week accuracy"],
      isAccessibleForFree: true,
      keywords: ["MLB", "prediction", "accuracy", "sabermetrics"],
    },
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb items={[{ label: "MLB Analysis", href: "/en/mlb" }, { label: "Prediction Review" }]} locale="en" />
      <div>
        <h1 className="text-3xl font-bold">MLB Prediction Review</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Overall record, streaks, and breakdowns by team, home/away, and day of week for strong/full convergence picks.
        </p>
      </div>

      <section aria-labelledby="mlb-reviews-en-misses-title">
        <h2 id="mlb-reviews-en-misses-title" className="sr-only">
          Missed predictions
        </h2>
        <Link
          href="/en/mlb/reviews/misses"
          className="group bg-gradient-to-r from-red-500/5 to-orange-500/5 dark:from-red-500/10 dark:to-orange-500/10 rounded-xl border border-red-500/20 p-5 flex flex-col justify-between hover:border-red-500/50 transition-colors"
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              🧭 Retrospective — Missed Predictions
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              High-confidence misses, with the factors that (wrongly) backed each prediction.
            </p>
          </div>
          <span className="text-sm font-medium text-red-600 dark:text-red-400 mt-3 group-hover:underline self-start">
            View retrospective →
          </span>
        </Link>
      </section>

      {hasAnyData ? (
        <>
          <section aria-labelledby="mlb-reviews-en-convergence-title" className="space-y-3">
            <h2 id="mlb-reviews-en-convergence-title" className="text-lg font-bold">
              Overall Convergence Pick Record
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {strongConvergenceRecord.total > 0 && (
                <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-brand-500/30 p-5 space-y-1">
                  <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide">Strong Convergence</p>
                  <p className="text-2xl font-bold">
                    {strongConvergenceRecord.wins}W {strongConvergenceRecord.losses}L
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {strongConvergenceRecord.total} games ·{' '}
                    {computeWinRatePct(strongConvergenceRecord.wins, strongConvergenceRecord.total)}% accuracy
                  </p>
                </div>
              )}
              {completeConvergenceRecord.total > 0 && (
                <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-amber-500/40 p-5 space-y-1">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">★ Full Convergence</p>
                  <p className="text-2xl font-bold">
                    {completeConvergenceRecord.wins}W {completeConvergenceRecord.losses}L
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {completeConvergenceRecord.total} games ·{' '}
                    {computeWinRatePct(completeConvergenceRecord.wins, completeConvergenceRecord.total)}% accuracy
                  </p>
                </div>
              )}
            </div>
          </section>

          <ConvergenceStreakBadges
            titleId="mlb-reviews-en-streak-title"
            strongStreak={strongConvergenceStreak}
            strongBestStreak={strongBestStreak}
            completeStreak={completeConvergenceStreak}
            completeBestStreak={completeBestStreak}
            locale="en"
          />

          <ConvergenceTeamStatsBadges
            titleId="mlb-reviews-en-team-stats-title"
            strongTeamStats={strongTeamStats}
            completeTeamStats={completeTeamStats}
            nameResolver={mlbShortTeamName}
            locale="en"
          />

          <ConvergenceHomeAwayBadges
            titleId="mlb-reviews-en-home-away-title"
            strongSplit={strongHomeAwaySplit}
            completeSplit={completeHomeAwaySplit}
            locale="en"
          />

          <ConvergenceDayOfWeekBadges
            titleId="mlb-reviews-en-day-of-week-title"
            strongSplit={strongDayOfWeekSplit}
            completeSplit={completeDayOfWeekSplit}
            locale="en"
          />
        </>
      ) : (
        <EmptyState
          title="No verified convergence picks yet."
          description="Data fills in automatically once the pipeline runs."
        />
      )}
    </div>
  );
}
