import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  SMALL_SAMPLE_N,
  SITE_URL,
  ACCURACY_GOOD_RATE,
  ACCURACY_MID_RATE,
  MONTHLY_REVIEW_NAV_LOOKBACK_MONTHS,
  MLB_FACTOR_PICK_STRONG,
  MLB_FACTOR_PICK_COMPLETE,
  mlbShortTeamName,
} from '@moneyball/shared';
import {
  getMlbRecentConvergencePickRecord,
  computeWinRatePct,
  getMlbConvergencePickStreak,
  getMlbConvergencePickBestStreak,
  getMlbConvergencePickHomeAwaySplit,
  getMlbConvergencePickDayOfWeekSplit,
  getMlbConvergencePickTeamStats,
} from "@/lib/analysis/convergenceRecord";
import { parseMonthId, getRecentMonths } from "@/lib/reviews/computeMonthRange";
import { buildMlbMonthlyReview } from "@/lib/reviews/buildMlbMonthlyReview";
import { ShareButtons } from "@/components/share/ShareButtons";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { MlbTeamLogo } from "@/components/shared/MlbTeamLogo";
import { MonthlyTeamStatsSortControl } from "@/components/reviews/MonthlyTeamStatsSortControl";
import { MlbHighlightCard } from "@/components/reviews/MlbHighlightCard";
import { ConvergenceTeamStatsBadges } from "@/components/reviews/ConvergenceTeamStatsBadges";
import { ConvergenceHomeAwayBadges } from "@/components/reviews/ConvergenceHomeAwayBadges";
import { ConvergenceDayOfWeekBadges } from "@/components/reviews/ConvergenceDayOfWeekBadges";
import { neutral } from "@/lib/design-tokens";

// mlb/reviews/monthly/[month]/page.tsx(KO) 의 EN 대응 (cycle 2356 — 다중 cycle carry-over:
// cycle 620 최초 언급 → cycle 2338/2341/2342/2355 명시적 carry-over → weekly EN 미러
// 완료(cycle 2355) 직후 이번 cycle 착수). buildMlbMonthlyReview 에 locale param 추가
// (기본값 'ko', 기존 KO callsite 무변경) 후 'en' 로 소비 — weekly EN 미러와 동일 방법론.
export const revalidate = 3600; // REVIEWS_MONTHLY_ISR_SECONDS (Next.js 16 Turbopack: literal required)

interface PageProps {
  params: Promise<{ month: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { month } = await params;
  const range = parseMonthId(month);
  if (!range) return {};
  const url = `${SITE_URL}/en/mlb/reviews/monthly/${month}`;
  const title = `${range.label} MLB Monthly Review`;
  const description = `${range.label} MLB prediction monthly performance report. Accuracy, highlight games, team stats, factor insights, month-over-month change.`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: { en: url, ko: `${SITE_URL}/mlb/reviews/monthly/${month}` },
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: `${range.endDate}T23:59:00+09:00`,
      authors: ["MoneyBall AI"],
      locale: "en_US",
      siteName: "MoneyBall Score",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function MlbMonthlyReviewPageEn({ params }: PageProps) {
  const { month } = await params;
  const range = parseMonthId(month);
  if (!range) notFound();

  const [
    review,
    strongConvergenceRecord,
    completeConvergenceRecord,
    strongConvergenceStreak,
    strongConvergenceBestStreak,
    completeConvergenceStreak,
    completeConvergenceBestStreak,
    strongHomeAwaySplit,
    completeHomeAwaySplit,
    strongDayOfWeekSplit,
    completeDayOfWeekSplit,
    strongTeamStats,
    completeTeamStats,
  ] = await Promise.all([
    buildMlbMonthlyReview(range, "en"),
    getMlbRecentConvergencePickRecord(MLB_FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getMlbRecentConvergencePickRecord(MLB_FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
    getMlbConvergencePickStreak(MLB_FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getMlbConvergencePickBestStreak(MLB_FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getMlbConvergencePickStreak(MLB_FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
    getMlbConvergencePickBestStreak(MLB_FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
    getMlbConvergencePickHomeAwaySplit(MLB_FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getMlbConvergencePickHomeAwaySplit(MLB_FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
    getMlbConvergencePickDayOfWeekSplit(MLB_FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getMlbConvergencePickDayOfWeekSplit(MLB_FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
    getMlbConvergencePickTeamStats(MLB_FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getMlbConvergencePickTeamStats(MLB_FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
  ]);
  const url = `${SITE_URL}/en/mlb/reviews/monthly/${month}`;

  const recent = getRecentMonths(MONTHLY_REVIEW_NAV_LOOKBACK_MONTHS)
    .filter((m) => m.monthId !== range.monthId)
    .slice(-4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${range.label} MLB Monthly Review`,
    datePublished: `${range.endDate}T23:59:00+09:00`,
    description: review.summary,
    articleBody: review.summary,
    author: {
      "@type": "Organization",
      name: "MoneyBall AI",
    },
    publisher: { "@type": "Organization", name: "MoneyBall Score" },
    mainEntityOfPage: url,
    inLanguage: "en-US",
  };

  const pctLabel = `${Math.round(review.accuracyRate * 100)}%`;
  const prevPctLabel =
    review.previousAccuracyRate != null
      ? `${Math.round(review.previousAccuracyRate * 100)}%`
      : null;
  const diffPp =
    review.previousAccuracyRate != null
      ? Math.round((review.accuracyRate - review.previousAccuracyRate) * 100)
      : null;

  return (
    <article className="max-w-4xl mx-auto space-y-8 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[
          { href: '/en/mlb/reviews', label: 'Prediction Review' },
          { href: '/en/mlb/reviews/monthly', label: 'Monthly' },
          { label: range.label },
        ]}
        locale="en"
      />

      <header className="space-y-2 border-b border-gray-200 dark:border-[var(--color-border)] pb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {range.monthId}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold">
          {range.label} MLB Monthly Review
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {range.startDate} ~ {range.endDate} · Auto-generated by MoneyBall AI
        </p>
      </header>

      <section className="bg-gradient-to-r from-brand-500/5 to-accent/5 dark:from-brand-500/10 dark:to-accent/10 rounded-xl border border-brand-500/20 p-6">
        <p className="text-base leading-relaxed text-gray-800 dark:text-gray-100">
          {review.summary}
        </p>
      </section>

      {review.verifiedGames > 0 && (
        <section
          aria-labelledby="mlb-monthly-summary-title-en"
          className="grid grid-cols-1 sm:grid-cols-4 gap-4"
        >
          <h2 id="mlb-monthly-summary-title-en" className="sr-only">
            Monthly summary
          </h2>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Verified games</p>
            <p className="text-3xl font-bold mt-1">
              {review.verifiedGames}
              <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">
                games
              </span>
            </p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Correct</p>
            <p className="text-3xl font-bold text-brand-500 mt-1">
              {review.correctGames}
              <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">
                games
              </span>
            </p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">Accuracy</p>
            <p
              className={`text-3xl font-bold mt-1 ${
                review.accuracyRate >= ACCURACY_GOOD_RATE
                  ? "text-brand-500"
                  : review.accuracyRate >= ACCURACY_MID_RATE
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
              }`}
            >
              {pctLabel}
            </p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">vs. last month</p>
            {prevPctLabel && diffPp !== null ? (
              <>
                <p
                  className={`text-3xl font-bold mt-1 font-mono ${
                    diffPp > 0
                      ? "text-brand-500"
                      : diffPp < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {diffPp > 0 ? "+" : ""}
                  {diffPp}pp
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Last month {prevPctLabel}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Not enough prior data
              </p>
            )}
          </div>
        </section>
      )}

      {(strongConvergenceRecord.total > 0 || completeConvergenceRecord.total > 0) && (
        <section aria-labelledby="mlb-monthly-convergence-title-en" className="space-y-3">
          <h2 id="mlb-monthly-convergence-title-en" className="text-xl font-bold">
            Convergence Pick Record
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {strongConvergenceRecord.total > 0 && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-brand-500/30 p-5">
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide">Strong Convergence</p>
                <p className="text-2xl font-bold mt-1">
                  {strongConvergenceRecord.wins}W {strongConvergenceRecord.losses}L
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {strongConvergenceRecord.total} games ·{' '}
                  {computeWinRatePct(strongConvergenceRecord.wins, strongConvergenceRecord.total)}% accuracy
                </p>
              </div>
            )}
            {completeConvergenceRecord.total > 0 && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-amber-500/30 p-5">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">★ Full Convergence</p>
                <p className="text-2xl font-bold mt-1">
                  {completeConvergenceRecord.wins}W {completeConvergenceRecord.losses}L
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {completeConvergenceRecord.total} games ·{' '}
                  {computeWinRatePct(completeConvergenceRecord.wins, completeConvergenceRecord.total)}% accuracy
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {(strongConvergenceStreak !== null || completeConvergenceStreak !== null) && (
        <section aria-labelledby="mlb-monthly-streak-title-en" className="space-y-3">
          <h2 id="mlb-monthly-streak-title-en" className="text-xl font-bold">
            Convergence Pick Streaks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {strongConvergenceStreak !== null && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-brand-500/30 p-5">
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide">Strong Convergence</p>
                <p className={`text-2xl font-bold mt-1 ${strongConvergenceStreak.type === 'win' ? 'text-amber-500 dark:text-amber-400' : 'text-sky-500 dark:text-sky-400'}`}>
                  {strongConvergenceStreak.type === 'win' ? '🔥' : '❄️'}{' '}
                  {strongConvergenceStreak.length} {strongConvergenceStreak.type === 'win' ? 'wins' : 'losses'}
                </p>
                {strongConvergenceBestStreak !== null && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Best this month: {strongConvergenceBestStreak.length} {strongConvergenceBestStreak.type === 'win' ? 'wins' : 'losses'}
                  </p>
                )}
              </div>
            )}
            {completeConvergenceStreak !== null && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-amber-500/30 p-5">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">★ Full Convergence</p>
                <p className={`text-2xl font-bold mt-1 ${completeConvergenceStreak.type === 'win' ? 'text-amber-600 dark:text-amber-400' : 'text-sky-500 dark:text-sky-400'}`}>
                  {completeConvergenceStreak.type === 'win' ? '🔥' : '❄️'}{' '}
                  {completeConvergenceStreak.length} {completeConvergenceStreak.type === 'win' ? 'wins' : 'losses'}
                </p>
                {completeConvergenceBestStreak !== null && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Best this month: {completeConvergenceBestStreak.length} {completeConvergenceBestStreak.type === 'win' ? 'wins' : 'losses'}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <ConvergenceHomeAwayBadges
        titleId="mlb-monthly-home-away-title-en"
        strongSplit={strongHomeAwaySplit}
        completeSplit={completeHomeAwaySplit}
        locale="en"
      />

      <ConvergenceDayOfWeekBadges
        titleId="mlb-monthly-day-of-week-title-en"
        strongSplit={strongDayOfWeekSplit}
        completeSplit={completeDayOfWeekSplit}
        locale="en"
      />

      <ConvergenceTeamStatsBadges
        titleId="mlb-monthly-team-stats-title-en"
        strongTeamStats={strongTeamStats}
        completeTeamStats={completeTeamStats}
        nameResolver={mlbShortTeamName}
        locale="en"
      />

      {review.highlights.length > 0 && (
        <section aria-labelledby="mlb-monthly-highlights-title-en" className="space-y-4">
          <h2 id="mlb-monthly-highlights-title-en" className="text-xl font-bold">
            Highlight Games
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {review.highlights.map((h) => (
              <MlbHighlightCard key={h.externalGameId} h={h} showResultSuffix locale="en" />
            ))}
          </div>
        </section>
      )}

      {review.teamStats.length > 0 && (
        <section aria-labelledby="mlb-monthly-teams-title-en" className="space-y-3">
          <h2 id="mlb-monthly-teams-title-en" className="text-xl font-bold">
            Prediction Accuracy by Team
          </h2>
          {review.teamStats.length >= 2 && <MonthlyTeamStatsSortControl locale="en" />}
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-2">
            {(() => {
              const sampleRankMap = new Map<string, number>();
              [...review.teamStats]
                .sort((a, b) => b.predicted - a.predicted)
                .forEach((row, idx) => sampleRankMap.set(row.teamCode, idx));
              return (
                <div data-monthly-team-stats-list className="space-y-2">
                  {review.teamStats.map((t) => {
                    const pct = Math.round(t.accuracy * 100);
                    const smallSample = t.predicted < SMALL_SAMPLE_N;
                    const sampleRank = sampleRankMap.get(t.teamCode) ?? 0;
                    return (
                      <div
                        key={t.teamCode}
                        className="flex items-center gap-3 text-sm"
                        data-sample-rank={sampleRank}
                        title={
                          smallSample
                            ? `Only ${t.predicted} predicted games — treat as reference only (needs ${SMALL_SAMPLE_N}+ for confidence)`
                            : undefined
                        }
                      >
                        <MlbTeamLogo team={t.teamCode} size={20} className="shrink-0" />
                        <span className="w-24 shrink-0 font-medium">
                          {t.teamName}
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${Math.min(100, pct)}%`,
                              backgroundColor: smallSample ? neutral[400] : t.color,
                            }}
                          />
                        </div>
                        <span
                          className={`text-xs font-mono w-20 text-right ${
                            smallSample
                              ? "text-gray-400 dark:text-gray-500"
                              : "text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          {pct}% ({t.correct}/{t.predicted})
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {(review.factorInsights.best || review.factorInsights.worst) && (
        <section aria-labelledby="mlb-monthly-factors-title-en" className="space-y-3">
          <h2 id="mlb-monthly-factors-title-en" className="text-xl font-bold">
            Factor Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {review.factorInsights.best && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-brand-500/30 p-5">
                <p className="text-xs text-brand-500 dark:text-brand-300 font-medium">
                  Most predictive factor
                </p>
                <p className="text-lg font-bold mt-1">
                  {review.factorInsights.best.label}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Correlation {review.factorInsights.best.correlation.toFixed(2)}
                  {review.factorInsights.best.directionalAccuracy != null &&
                    ` · Directional accuracy ${Math.round(
                      review.factorInsights.best.directionalAccuracy * 100,
                    )}%`}
                </p>
              </div>
            )}
            {review.factorInsights.worst && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-red-500/30 p-5">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  Least predictive factor
                </p>
                <p className="text-lg font-bold mt-1">
                  {review.factorInsights.worst.label}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Correlation {review.factorInsights.worst.correlation.toFixed(2)}
                  {review.factorInsights.worst.directionalAccuracy != null &&
                    ` · Directional accuracy ${Math.round(
                      review.factorInsights.worst.directionalAccuracy * 100,
                    )}%`}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {!review.hasData && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center">
          <span className="text-5xl block mb-4">📆</span>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
            No MLB prediction data for this month
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Check another month during the season.
          </p>
        </section>
      )}

      {recent.length > 0 && (
        <section className="border-t border-gray-200 dark:border-[var(--color-border)] pt-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Recent Monthly Reviews
          </h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((m) => (
              <Link
                key={m.monthId}
                href={`/en/mlb/reviews/monthly/${m.monthId}`}
                className="text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-gray-200 dark:border-[var(--color-border)] pt-4">
        <ShareButtons
          url={url}
          title={`${range.label} MLB Monthly Review`}
          text={review.summary}
        />
      </footer>
    </article>
  );
}
