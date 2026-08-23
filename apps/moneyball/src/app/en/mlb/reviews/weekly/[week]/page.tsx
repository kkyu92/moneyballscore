import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  SMALL_SAMPLE_N,
  mlbShortTeamName,
  SITE_URL,
  ACCURACY_GOOD_RATE,
  ACCURACY_MID_RATE,
  WEEKLY_REVIEW_NAV_LOOKBACK_WEEKS,
  MLB_FACTOR_PICK_STRONG,
  MLB_FACTOR_PICK_COMPLETE,
} from '@moneyball/shared';
import {
  getMlbRecentConvergencePickRecord,
  computeWinRatePct,
  getMlbConvergencePickStreak,
  getMlbConvergencePickBestStreak,
  getMlbConvergencePickHomeAwaySplit,
  getMlbConvergencePickTeamStats,
} from "@/lib/analysis/convergenceRecord";
import { parseWeekId, getRecentWeeks } from "@/lib/reviews/computeWeekRange";
import {
  buildMlbWeeklyReview,
  type MlbWeeklyGameResult,
} from "@/lib/reviews/buildMlbWeeklyReview";
import { ShareButtons } from "@/components/share/ShareButtons";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { MlbTeamLogo } from "@/components/shared/MlbTeamLogo";
import { WeeklyGamesSortControl } from "@/components/reviews/WeeklyGamesSortControl";
import { MlbHighlightCard } from "@/components/reviews/MlbHighlightCard";
import { ConvergenceTeamStatsBadges } from "@/components/reviews/ConvergenceTeamStatsBadges";
import { ConvergenceHomeAwayBadges } from "@/components/reviews/ConvergenceHomeAwayBadges";
import { neutral } from "@/lib/design-tokens";

// mlb/reviews/weekly/[week]/page.tsx(KO) 의 EN 대응 (wave-660, cycle 2355 — 다중 cycle
// carry-over: cycle 620 구조적 gap 최초 언급 → cycle 2338/2341 명시적 carry-over → 이번
// cycle 착수). buildMlbWeeklyReview/buildMlbFactorInsights 에 locale param 추가(기본값
// 'ko', 기존 KO callsite 무변경) 후 'en' 로 소비. monthly EN 미러는 스코프 밖 — 별도 cycle.
export const revalidate = 1800; // MLB_LIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

interface PageProps {
  params: Promise<{ week: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { week } = await params;
  const range = parseWeekId(week);
  if (!range) return {};
  const url = `${SITE_URL}/en/mlb/reviews/weekly/${week}`;
  const title = `${range.label} MLB Weekly Review`;
  const description = `${range.label} MLB prediction weekly performance report. Accuracy, highlight games, team stats, factor insights.`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: { en: url, ko: `${SITE_URL}/mlb/reviews/weekly/${week}` },
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

function GameResultRowEn({ g, style }: { g: MlbWeeklyGameResult; style?: CSSProperties }) {
  const correctBadge =
    g.isCorrect === true ? (
      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-brand-500/15 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300">
        Hit
      </span>
    ) : g.isCorrect === false ? (
      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300">
        Miss
      </span>
    ) : (
      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[var(--color-surface-card)] text-gray-400 dark:text-gray-500">
        Pending
      </span>
    );

  const confLabel =
    g.confidence != null
      ? `${Math.round(g.confidence * 100)}%`
      : null;

  const predictedWinnerCode =
    g.predictedHomeWin === null ? null : g.predictedHomeWin ? g.homeCode : g.awayCode;

  return (
    <Link
      href={`/en/mlb/games/${g.gameDate}/${g.homeCode}-vs-${g.awayCode}`}
      style={style}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-brand-50 dark:hover:bg-[var(--color-surface-card)] transition-colors group"
    >
      <span className="w-14 shrink-0 text-xs text-gray-400 dark:text-gray-500 tabular-nums">
        {g.gameDate.slice(5).replace('-', '/')}
      </span>
      <MlbTeamLogo team={g.awayCode} size={16} className="shrink-0" />
      <span className="text-gray-600 dark:text-gray-300 w-10 truncate text-xs">
        {mlbShortTeamName(g.awayCode)}
      </span>
      <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums font-mono mx-0.5">
        {g.awayScore ?? '-'} : {g.homeScore ?? '-'}
      </span>
      <span className="font-medium text-gray-800 dark:text-gray-100 w-10 truncate text-xs">
        {mlbShortTeamName(g.homeCode)}
      </span>
      <MlbTeamLogo team={g.homeCode} size={16} className="shrink-0" />
      <div className="flex-1" />
      {predictedWinnerCode && (
        <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline truncate max-w-[5rem]">
          Predicted {mlbShortTeamName(predictedWinnerCode)}{confLabel ? ` ${confLabel}` : ''}
        </span>
      )}
      {correctBadge}
      <span className="text-gray-300 dark:text-gray-600 text-xs group-hover:text-brand-500 transition-colors">→</span>
    </Link>
  );
}

export default async function MlbWeeklyReviewPageEn({ params }: PageProps) {
  const { week } = await params;
  const range = parseWeekId(week);
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
    strongTeamStats,
    completeTeamStats,
  ] = await Promise.all([
    buildMlbWeeklyReview(range, "en"),
    getMlbRecentConvergencePickRecord(MLB_FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getMlbRecentConvergencePickRecord(MLB_FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
    getMlbConvergencePickStreak(MLB_FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getMlbConvergencePickBestStreak(MLB_FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getMlbConvergencePickStreak(MLB_FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
    getMlbConvergencePickBestStreak(MLB_FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
    getMlbConvergencePickHomeAwaySplit(MLB_FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getMlbConvergencePickHomeAwaySplit(MLB_FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
    getMlbConvergencePickTeamStats(MLB_FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getMlbConvergencePickTeamStats(MLB_FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
  ]);
  const url = `${SITE_URL}/en/mlb/reviews/weekly/${week}`;

  const confRankMap = new Map<string, number>();
  [...review.games]
    .sort((a, b) => (b.confidence ?? -1) - (a.confidence ?? -1))
    .forEach((g, idx) => confRankMap.set(g.externalGameId, idx));

  const recent = getRecentWeeks(WEEKLY_REVIEW_NAV_LOOKBACK_WEEKS)
    .filter((w) => w.weekId !== range.weekId)
    .slice(-3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${range.label} MLB Weekly Review`,
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

  return (
    <article className="max-w-4xl mx-auto space-y-8 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[
          { href: '/en/mlb/reviews', label: 'Prediction Review' },
          { href: '/en/mlb/reviews/weekly', label: 'Weekly' },
          { label: range.label },
        ]}
        locale="en"
      />

      <header className="space-y-2 border-b border-gray-200 dark:border-[var(--color-border)] pb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {range.weekId}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold">
          {range.label} MLB Weekly Review
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
          aria-labelledby="mlb-weekly-summary-title-en"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <h2 id="mlb-weekly-summary-title-en" className="sr-only">
            Weekly summary
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
        </section>
      )}

      {(strongConvergenceRecord.total > 0 || completeConvergenceRecord.total > 0) && (
        <section aria-labelledby="mlb-weekly-convergence-title-en" className="space-y-3">
          <h2 id="mlb-weekly-convergence-title-en" className="text-xl font-bold">
            Convergence Pick Record
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
      )}

      {(strongConvergenceStreak !== null || completeConvergenceStreak !== null) && (
        <section aria-labelledby="mlb-weekly-streak-title-en" className="space-y-3">
          <h2 id="mlb-weekly-streak-title-en" className="text-lg font-bold">
            Convergence Pick Streaks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {strongConvergenceStreak !== null && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-brand-500/30 p-5 space-y-1">
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide">Strong Convergence</p>
                <p className={`text-2xl font-bold ${strongConvergenceStreak.type === 'win' ? 'text-amber-500 dark:text-amber-400' : 'text-sky-500 dark:text-sky-400'}`}>
                  {strongConvergenceStreak.type === 'win' ? '🔥' : '❄️'}{' '}
                  {strongConvergenceStreak.length} {strongConvergenceStreak.type === 'win' ? 'wins' : 'losses'}
                </p>
                {strongConvergenceBestStreak !== null && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Best this week: {strongConvergenceBestStreak.length} {strongConvergenceBestStreak.type === 'win' ? 'wins' : 'losses'}
                  </p>
                )}
              </div>
            )}
            {completeConvergenceStreak !== null && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-amber-500/40 p-5 space-y-1">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">★ Full Convergence</p>
                <p className={`text-2xl font-bold ${completeConvergenceStreak.type === 'win' ? 'text-amber-600 dark:text-amber-400' : 'text-sky-500 dark:text-sky-400'}`}>
                  {completeConvergenceStreak.type === 'win' ? '🔥' : '❄️'}{' '}
                  {completeConvergenceStreak.length} {completeConvergenceStreak.type === 'win' ? 'wins' : 'losses'}
                </p>
                {completeConvergenceBestStreak !== null && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Best this week: {completeConvergenceBestStreak.length} {completeConvergenceBestStreak.type === 'win' ? 'wins' : 'losses'}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <ConvergenceHomeAwayBadges
        titleId="mlb-weekly-home-away-title-en"
        strongSplit={strongHomeAwaySplit}
        completeSplit={completeHomeAwaySplit}
        locale="en"
      />

      <ConvergenceTeamStatsBadges
        titleId="mlb-weekly-team-stats-title-en"
        strongTeamStats={strongTeamStats}
        completeTeamStats={completeTeamStats}
        nameResolver={mlbShortTeamName}
        locale="en"
      />

      {review.highlights.length > 0 && (
        <section aria-labelledby="mlb-weekly-highlights-title-en" className="space-y-4">
          <h2 id="mlb-weekly-highlights-title-en" className="text-xl font-bold">
            Highlight Games
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {review.highlights.map((h) => (
              <MlbHighlightCard key={h.externalGameId} h={h} showResultSuffix locale="en" />
            ))}
          </div>
        </section>
      )}

      {review.teamStats.length > 0 && (
        <section aria-labelledby="mlb-weekly-teams-title-en" className="space-y-3">
          <h2 id="mlb-weekly-teams-title-en" className="text-xl font-bold">
            Prediction Accuracy by Team
          </h2>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-2">
            {review.teamStats.map((t) => {
              const pct = Math.round(t.accuracy * 100);
              const smallSample = t.predicted < SMALL_SAMPLE_N;
              return (
                <div
                  key={t.teamCode}
                  className="flex items-center gap-3 text-sm"
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
        </section>
      )}

      {(review.factorInsights.best || review.factorInsights.worst) && (
        <section aria-labelledby="mlb-weekly-factors-title-en" className="space-y-3">
          <h2 id="mlb-weekly-factors-title-en" className="text-xl font-bold">
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

      {review.games.length > 0 && (
        <section aria-labelledby="mlb-weekly-games-title-en" className="space-y-3">
          <details className="group">
            <summary
              id="mlb-weekly-games-title-en"
              className="flex items-center justify-between cursor-pointer list-none rounded-xl group-open:rounded-b-none bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] px-5 py-4 hover:bg-gray-50 dark:hover:bg-[var(--color-surface)] transition-colors"
            >
              <h2 className="text-base font-bold">
                All Games This Week
                <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">
                  {review.games.length} games
                </span>
              </h2>
              <svg
                className="w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform group-open:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-2 group-open:mt-0 bg-white dark:bg-[var(--color-surface-card)] rounded-xl group-open:rounded-t-none border border-gray-200 dark:border-[var(--color-border)] group-open:border-t-0 overflow-hidden">
              <WeeklyGamesSortControl locale="en" />
              <div className="divide-y divide-gray-100 dark:divide-gray-700/40" data-weekly-games>
                {review.games.map((g) => {
                  const cardStyle = {
                    '--mb-weekly-game-order': confRankMap.get(g.externalGameId) ?? 0,
                  } as CSSProperties;
                  return <GameResultRowEn key={g.externalGameId} g={g} style={cardStyle} />;
                })}
              </div>
            </div>
          </details>
        </section>
      )}

      {!review.hasData && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center">
          <span className="text-5xl block mb-4">📅</span>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
            No MLB prediction data for this week
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Check another week during the season.
          </p>
        </section>
      )}

      {recent.length > 0 && (
        <section className="border-t border-gray-200 dark:border-[var(--color-border)] pt-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Recent Weekly Reviews
          </h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((w) => (
              <Link
                key={w.weekId}
                href={`/en/mlb/reviews/weekly/${w.weekId}`}
                className="text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                {w.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-gray-200 dark:border-[var(--color-border)] pt-4">
        <ShareButtons
          url={url}
          title={`${range.label} MLB Weekly Review`}
          text={review.summary}
        />
      </footer>
    </article>
  );
}
