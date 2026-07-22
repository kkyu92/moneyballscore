import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SMALL_SAMPLE_N, shortTeamName, SITE_URL, ACCURACY_GOOD_RATE, FACTOR_PICK_STRONG, FACTOR_PICK_COMPLETE, CONVERGENCE_RECORD_ALL_LIMIT, WEEKLY_REVIEW_NAV_LOOKBACK_WEEKS } from '@moneyball/shared';
import { getRecentConvergencePickRecord, computeWinRatePct, computeWinRateColorClass, getConvergencePickStreak, getConvergencePickBestStreak, getConvergencePickHomeAwaySplit, getConvergencePickTeamStats } from '@/lib/analysis/convergenceRecord';
import { parseWeekId, getRecentWeeks } from "@/lib/reviews/computeWeekRange";
import {
  buildWeeklyReview,
  type WeeklyGameResult,
} from "@/lib/reviews/buildWeeklyReview";
import { ShareButtons } from "@/components/share/ShareButtons";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { WeeklyGamesSortControl } from "@/components/reviews/WeeklyGamesSortControl";
import { HighlightCard } from "@/components/reviews/HighlightCard";
import { ConvergenceTeamStatsBadges } from "@/components/reviews/ConvergenceTeamStatsBadges";
import { neutral } from "@/lib/design-tokens";

export const revalidate = 1800; // REVIEWS_WEEKLY_ISR_SECONDS (Next.js 16 Turbopack: literal required)

interface PageProps {
  params: Promise<{ week: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { week } = await params;
  const range = parseWeekId(week);
  if (!range) return {};
  const url = `${SITE_URL}/reviews/weekly/${week}`;
  const title = `${range.label} 주간 리뷰`;
  const description = `${range.label} KBO 승부예측 주간 성과 리포트. 적중률, 하이라이트 경기, 팀별 통계, 팩터 인사이트.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: `${range.endDate}T23:59:00+09:00`,
      authors: ["MoneyBall AI"],
      locale: "ko_KR",
      siteName: "MoneyBall Score",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function GameResultRow({ g, style }: { g: WeeklyGameResult; style?: CSSProperties }) {
  const correctBadge =
    g.isCorrect === true ? (
      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-brand-500/15 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300">
        적중
      </span>
    ) : g.isCorrect === false ? (
      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300">
        빗나감
      </span>
    ) : (
      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[var(--color-surface-card)] text-gray-400 dark:text-gray-500">
        미결
      </span>
    );

  const confLabel =
    g.confidence != null
      ? `${Math.round(g.confidence * 100)}%`
      : null;

  return (
    <Link
      href={`/analysis/game/${g.gameId}`}
      style={style}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-brand-50 dark:hover:bg-[var(--color-surface-card)] transition-colors group"
    >
      <span className="w-14 shrink-0 text-xs text-gray-400 dark:text-gray-500 tabular-nums">
        {g.gameDate.slice(5).replace('-', '/')}
      </span>
      <TeamLogo team={g.awayCode} size={16} className="shrink-0" />
      <span className="text-gray-600 dark:text-gray-300 w-10 truncate text-xs">
        {shortTeamName(g.awayCode)}
      </span>
      <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums font-mono mx-0.5">
        {g.awayScore ?? '-'} : {g.homeScore ?? '-'}
      </span>
      <span className="font-medium text-gray-800 dark:text-gray-100 w-10 truncate text-xs">
        {shortTeamName(g.homeCode)}
      </span>
      <TeamLogo team={g.homeCode} size={16} className="shrink-0" />
      <div className="flex-1" />
      {g.predictedWinnerCode && (
        <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline truncate max-w-[5rem]">
          예측 {shortTeamName(g.predictedWinnerCode)}{confLabel ? ` ${confLabel}` : ''}
        </span>
      )}
      {correctBadge}
      <span className="text-gray-300 dark:text-gray-600 text-xs group-hover:text-brand-500 transition-colors">→</span>
    </Link>
  );
}

export default async function WeeklyReviewPage({ params }: PageProps) {
  const { week } = await params;
  const range = parseWeekId(week);
  if (!range) notFound();

  // wave-584: 강수렴/완전수렴 픽 주간 성적 — startDate~endDate 범위 한정
  // wave-594: 강수렴/완전수렴 픽 주간 스트리크 (범위 내 마감 streak + 범위 내 최장 streak)
  // wave-601: 강수렴/완전수렴 픽 주간 홈/어웨이 분리 성적 (월간 wave-600 재사용, 주 범위 한정)
  // wave-603: 강수렴/완전수렴 픽 주간 팀별 분리 성적 (reviews 허브 wave-596 재사용, 주 범위 한정)
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
    buildWeeklyReview(range),
    getRecentConvergencePickRecord(CONVERGENCE_RECORD_ALL_LIMIT, FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getRecentConvergencePickRecord(CONVERGENCE_RECORD_ALL_LIMIT, FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
    getConvergencePickStreak(FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getConvergencePickBestStreak(FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getConvergencePickStreak(FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
    getConvergencePickBestStreak(FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
    getConvergencePickHomeAwaySplit(FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getConvergencePickHomeAwaySplit(FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
    getConvergencePickTeamStats(FACTOR_PICK_STRONG, range.startDate, range.endDate),
    getConvergencePickTeamStats(FACTOR_PICK_COMPLETE, range.startDate, range.endDate),
  ]);
  const url = `${SITE_URL}/reviews/weekly/${week}`;

  // confidence desc 순위 — date default 도착 순서에서 confidence desc rank 계산.
  // WeeklyGamesSortControl 가 '확신도순' 활성 시 CSS variable 로 flex order 토글.
  // confidence null 은 -1 처리 = 마지막 rank.
  const confRankMap = new Map<number, number>();
  [...review.games]
    .sort((a, b) => (b.confidence ?? -1) - (a.confidence ?? -1))
    .forEach((g, idx) => confRankMap.set(g.gameId, idx));

  const recent = getRecentWeeks(WEEKLY_REVIEW_NAV_LOOKBACK_WEEKS)
    .filter((w) => w.weekId !== range.weekId)
    .slice(-3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${range.label} 주간 리뷰`,
    datePublished: `${range.endDate}T23:59:00+09:00`,
    description: review.summary,
    articleBody: review.summary,
    author: {
      "@type": "Organization",
      name: "MoneyBall AI",
    },
    publisher: { "@type": "Organization", name: "MoneyBall Score" },
    mainEntityOfPage: url,
    inLanguage: "ko-KR",
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
          { href: '/reviews', label: '리뷰' },
          { href: '/reviews/weekly', label: '주간' },
          { label: range.label },
        ]}
      />

      <header className="space-y-2 border-b border-gray-200 dark:border-[var(--color-border)] pb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {range.weekId}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold">
          {range.label} 주간 리뷰
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {range.startDate} ~ {range.endDate} · MoneyBall AI 자동 생성
        </p>
      </header>

      <section className="bg-gradient-to-r from-brand-500/5 to-accent/5 dark:from-brand-500/10 dark:to-accent/10 rounded-xl border border-brand-500/20 p-6">
        <p className="text-base leading-relaxed text-gray-800 dark:text-gray-100">
          {review.summary}
        </p>
      </section>

      {review.verifiedGames > 0 && (
        <section
          aria-labelledby="weekly-summary-title"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <h2 id="weekly-summary-title" className="sr-only">
            주간 요약
          </h2>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">검증 경기</p>
            <p className="text-3xl font-bold mt-1">
              {review.verifiedGames}
              <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">
                경기
              </span>
            </p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">적중</p>
            <p className="text-3xl font-bold text-brand-500 mt-1">
              {review.correctGames}
              <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">
                경기
              </span>
            </p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">적중률</p>
            <p
              className={`text-3xl font-bold mt-1 ${
                review.accuracyRate >= ACCURACY_GOOD_RATE
                  ? "text-brand-500"
                  : review.accuracyRate >= 0.5
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
              }`}
            >
              {pctLabel}
            </p>
          </div>
        </section>
      )}

      {/* wave-584: 수렴 픽 주간 성적 — 강수렴/완전수렴 W-L 카드 */}
      {(strongConvergenceRecord.total > 0 || completeConvergenceRecord.total > 0) && (
        <section aria-labelledby="weekly-convergence-title" className="space-y-3">
          <h2 id="weekly-convergence-title" className="text-xl font-bold">
            수렴 픽 성적
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

      {/* wave-594: 수렴 픽 주간 스트리크 — 강수렴/완전수렴 범위 내 마감 streak + 범위 내 최장 streak */}
      {(strongConvergenceStreak !== null || completeConvergenceStreak !== null) && (
        <section aria-labelledby="weekly-streak-title" className="space-y-3">
          <h2 id="weekly-streak-title" className="text-lg font-bold">
            수렴 픽 스트리크
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {strongConvergenceStreak !== null && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-brand-500/30 p-5 space-y-1">
                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide">강수렴 픽</p>
                <p className={`text-2xl font-bold ${strongConvergenceStreak.type === 'win' ? 'text-amber-500 dark:text-amber-400' : 'text-sky-500 dark:text-sky-400'}`}>
                  {strongConvergenceStreak.type === 'win' ? '🔥' : '❄️'}{' '}
                  {strongConvergenceStreak.length}연{strongConvergenceStreak.type === 'win' ? '승' : '패'}
                </p>
                {strongConvergenceBestStreak !== null && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    이번 주 최장 {strongConvergenceBestStreak.length}연{strongConvergenceBestStreak.type === 'win' ? '승' : '패'}
                  </p>
                )}
              </div>
            )}
            {completeConvergenceStreak !== null && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-amber-500/40 p-5 space-y-1">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">★ 완전수렴 픽</p>
                <p className={`text-2xl font-bold ${completeConvergenceStreak.type === 'win' ? 'text-amber-600 dark:text-amber-400' : 'text-sky-500 dark:text-sky-400'}`}>
                  {completeConvergenceStreak.type === 'win' ? '🔥' : '❄️'}{' '}
                  {completeConvergenceStreak.length}연{completeConvergenceStreak.type === 'win' ? '승' : '패'}
                </p>
                {completeConvergenceBestStreak !== null && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    이번 주 최장 {completeConvergenceBestStreak.length}연{completeConvergenceBestStreak.type === 'win' ? '승' : '패'}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* wave-601: 수렴 픽 주간 홈/어웨이 분리 성적 배지 — 강수렴/완전수렴 (월간 wave-600 재사용, 주 범위 한정) */}
      {(strongHomeAwaySplit !== null || completeHomeAwaySplit !== null) && (
        <section aria-labelledby="weekly-home-away-title" className="space-y-2">
          <h2 id="weekly-home-away-title" className="text-lg font-bold">
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

      {/* wave-603: 수렴 픽 주간 팀별 분리 성적 배지 — 강수렴/완전수렴 (reviews 허브 wave-596 재사용, 주 범위 한정) */}
      <ConvergenceTeamStatsBadges
        titleId="weekly-team-stats-title"
        strongTeamStats={strongTeamStats}
        completeTeamStats={completeTeamStats}
      />

      {review.highlights.length > 0 && (
        <section aria-labelledby="weekly-highlights-title" className="space-y-4">
          <h2 id="weekly-highlights-title" className="text-xl font-bold">
            하이라이트 경기
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {review.highlights.map((h) => (
              <HighlightCard key={h.gameId} h={h} showResultSuffix />
            ))}
          </div>
        </section>
      )}

      {review.teamStats.length > 0 && (
        <section aria-labelledby="weekly-teams-title" className="space-y-3">
          <h2 id="weekly-teams-title" className="text-xl font-bold">
            팀별 예측 적중률
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
                      ? `예측 경기가 ${t.predicted}경기뿐이라 참고용입니다 (${SMALL_SAMPLE_N}경기 이상부터 신뢰 가능)`
                      : undefined
                  }
                >
                  <TeamLogo team={t.teamCode} size={20} className="shrink-0" />
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
        <section aria-labelledby="weekly-factors-title" className="space-y-3">
          <h2 id="weekly-factors-title" className="text-xl font-bold">
            팩터 인사이트
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {review.factorInsights.best && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-brand-500/30 p-5">
                <p className="text-xs text-brand-500 dark:text-brand-300 font-medium">
                  가장 잘 맞힌 팩터
                </p>
                <p className="text-lg font-bold mt-1">
                  {review.factorInsights.best.label}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  상관계수 {review.factorInsights.best.correlation.toFixed(2)}
                  {review.factorInsights.best.directionalAccuracy != null &&
                    ` · 방향 정확 ${Math.round(
                      review.factorInsights.best.directionalAccuracy * 100,
                    )}%`}
                </p>
              </div>
            )}
            {review.factorInsights.worst && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-red-500/30 p-5">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  가장 빗나간 팩터
                </p>
                <p className="text-lg font-bold mt-1">
                  {review.factorInsights.worst.label}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  상관계수 {review.factorInsights.worst.correlation.toFixed(2)}
                  {review.factorInsights.worst.directionalAccuracy != null &&
                    ` · 방향 정확 ${Math.round(
                      review.factorInsights.worst.directionalAccuracy * 100,
                    )}%`}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {review.games.length > 0 && (
        <section aria-labelledby="weekly-games-title" className="space-y-3">
          <details className="group">
            <summary
              id="weekly-games-title"
              className="flex items-center justify-between cursor-pointer list-none rounded-xl group-open:rounded-b-none bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] px-5 py-4 hover:bg-gray-50 dark:hover:bg-[var(--color-surface)] transition-colors"
            >
              <h2 className="text-base font-bold">
                이번 주 전체 경기
                <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">
                  {review.games.length}경기
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
              <WeeklyGamesSortControl />
              <div className="divide-y divide-gray-100 dark:divide-gray-700/40" data-weekly-games>
                {review.games.map((g) => {
                  const cardStyle = {
                    '--mb-weekly-game-order': confRankMap.get(g.gameId) ?? 0,
                  } as CSSProperties;
                  return <GameResultRow key={g.gameId} g={g} style={cardStyle} />;
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
            이 주간에는 예측 데이터가 없습니다
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            시즌 중 다른 주간을 확인해주세요.
          </p>
        </section>
      )}

      {recent.length > 0 && (
        <section className="border-t border-gray-200 dark:border-[var(--color-border)] pt-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            최근 주간 리뷰
          </h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((w) => (
              <Link
                key={w.weekId}
                href={`/reviews/weekly/${w.weekId}`}
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
          title={`${range.label} 주간 리뷰`}
          text={review.summary}
        />
      </footer>
    </article>
  );
}
