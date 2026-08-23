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
import { getRecentWeeks } from "@/lib/reviews/computeWeekRange";
import { getRecentMonths } from "@/lib/reviews/computeMonthRange";
import { REVIEWS_HUB_RECENT_WEEKS, REVIEWS_HUB_RECENT_MONTHS } from "@moneyball/shared";

// en/mlb/reviews (wave-659, cycle 2339) — KO /mlb/reviews 미러. weekly 서브페이지 EN 미러
// 신규 배선(wave-660, cycle 2355 — cycle 620 최초 언급 이후 다중 cycle carry-over), monthly
// 서브페이지 EN 미러(cycle 2356 — weekly 완료 직후 후속) 로 KO/EN parity 완결.
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

  const recentWeeks = getRecentWeeks(REVIEWS_HUB_RECENT_WEEKS, new Date(), 'en');
  const recentMonths = getRecentMonths(REVIEWS_HUB_RECENT_MONTHS, new Date(), 'en');

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

      <section aria-labelledby="mlb-reviews-en-periodic-title" className="grid gap-4 md:grid-cols-2">
        <h2 id="mlb-reviews-en-periodic-title" className="sr-only">
          Weekly review + missed predictions
        </h2>
        <div className="bg-gradient-to-r from-brand-500/5 to-accent/5 dark:from-brand-500/10 dark:to-accent/10 rounded-xl border border-brand-500/20 p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                📅 Weekly Review
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Highlights, team performance, and factor insights every week
              </p>
            </div>
            <Link
              href={`/en/mlb/reviews/weekly/${recentWeeks[recentWeeks.length - 1].weekId}`}
              className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              This week →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentWeeks.map((w) => (
              <Link
                key={w.weekId}
                href={`/en/mlb/reviews/weekly/${w.weekId}`}
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
                📆 Monthly Review
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Month-over-month diff, team stats, and factor insights
              </p>
            </div>
            <Link
              href={`/en/mlb/reviews/monthly/${recentMonths[recentMonths.length - 1].monthId}`}
              className="text-sm font-medium text-accent hover:underline"
            >
              This month →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentMonths.map((m) => (
              <Link
                key={m.monthId}
                href={`/en/mlb/reviews/monthly/${m.monthId}`}
                className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] hover:border-accent hover:text-accent transition-colors"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </div>

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
