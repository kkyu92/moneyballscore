import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { KBO_TEAMS } from "@moneyball/shared";
import {
  parseMonthId,
  getRecentMonths,
} from "@/lib/reviews/computeMonthRange";
import { buildMonthlyReview } from "@/lib/reviews/buildMonthlyReview";
import type { WeeklyHighlight } from "@/lib/reviews/buildWeeklyReview";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ month: string }>;
}

const SITE_URL = "https://moneyballscore.vercel.app";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { month } = await params;
  const range = parseMonthId(month);
  if (!range) return {};
  const url = `${SITE_URL}/reviews/monthly/${month}`;
  const title = `${range.label} 월간 리뷰`;
  const description = `${range.label} KBO 승부예측 월간 성과 리포트. 적중률, 하이라이트, 팀별 통계, 팩터 인사이트, 전월 대비 변화.`;
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
  };
}

function HighlightCard({ h }: { h: WeeklyHighlight }) {
  const winnerName = h.predictedWinnerCode
    ? KBO_TEAMS[h.predictedWinnerCode]?.name.split(" ")[0]
    : null;
  const badgeClass =
    h.badge === "박빙 적중"
      ? "bg-purple-500/15 text-purple-600 dark:text-purple-300"
      : h.badge === "고확신 적중"
        ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
        : "bg-red-500/15 text-red-600 dark:text-red-400";
  return (
    <Link
      href={`/analysis/game/${h.gameId}`}
      className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${badgeClass}`}
        >
          {h.badge}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {h.gameDate}
        </span>
      </div>
      <p className="text-base font-semibold">
        {h.awayName}
        <span className="font-mono mx-2">
          {h.awayScore ?? "-"} : {h.homeScore ?? "-"}
        </span>
        {h.homeName}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        예측 {winnerName ?? ""} {Math.round(h.confidence * 100)}%
      </p>
    </Link>
  );
}

export default async function MonthlyReviewPage({ params }: PageProps) {
  const { month } = await params;
  const range = parseMonthId(month);
  if (!range) notFound();

  const review = await buildMonthlyReview(range);
  const url = `${SITE_URL}/reviews/monthly/${month}`;

  const recent = getRecentMonths(6)
    .filter((m) => m.monthId !== range.monthId)
    .slice(-4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${range.label} 월간 리뷰`,
    datePublished: `${range.endDate}T23:59:00+09:00`,
    description: review.summary,
    articleBody: review.summary,
    author: {
      "@type": "Organization",
      name: "MoneyBall AI",
    },
    publisher: { "@type": "Organization", name: "MoneyBall Score" },
    mainEntityOfPage: url,
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

      <header className="space-y-2 border-b border-gray-200 dark:border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Link href="/reviews" className="hover:text-brand-500">
            리뷰
          </Link>
          <span aria-hidden>/</span>
          <span>월간</span>
          <span aria-hidden>/</span>
          <span className="font-mono">{range.monthId}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          {range.label} 월간 리뷰
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {range.startDate} ~ {range.endDate} · MoneyBall AI 자동 집계
        </p>
      </header>

      <section className="bg-gradient-to-r from-brand-500/5 to-accent/5 dark:from-brand-500/10 dark:to-accent/10 rounded-xl border border-brand-500/20 p-6">
        <p className="text-base leading-relaxed text-gray-800 dark:text-gray-100">
          {review.summary}
        </p>
      </section>

      {review.verifiedGames > 0 && (
        <section
          aria-labelledby="monthly-summary-title"
          className="grid grid-cols-1 sm:grid-cols-4 gap-4"
        >
          <h2 id="monthly-summary-title" className="sr-only">
            월간 요약
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
            <p className="text-3xl font-bold text-green-600 mt-1">
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
                review.accuracyRate >= 0.6
                  ? "text-green-600"
                  : review.accuracyRate >= 0.5
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {pctLabel}
            </p>
          </div>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">전월 대비</p>
            {prevPctLabel && diffPp !== null ? (
              <>
                <p
                  className={`text-3xl font-bold mt-1 font-mono ${
                    diffPp > 0
                      ? "text-green-600"
                      : diffPp < 0
                        ? "text-red-600"
                        : "text-gray-500"
                  }`}
                >
                  {diffPp > 0 ? "+" : ""}
                  {diffPp}%p
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  전월 {prevPctLabel}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                전월 데이터 부족
              </p>
            )}
          </div>
        </section>
      )}

      {review.highlights.length > 0 && (
        <section aria-labelledby="monthly-highlights-title" className="space-y-4">
          <h2 id="monthly-highlights-title" className="text-xl font-bold">
            하이라이트 경기
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {review.highlights.map((h) => (
              <HighlightCard key={h.gameId} h={h} />
            ))}
          </div>
        </section>
      )}

      {review.teamStats.length > 0 && (
        <section aria-labelledby="monthly-teams-title" className="space-y-3">
          <h2 id="monthly-teams-title" className="text-xl font-bold">
            팀별 월간 예측 적중률
          </h2>
          <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-2">
            {review.teamStats.map((t) => {
              const pct = Math.round(t.accuracy * 100);
              return (
                <div
                  key={t.teamCode}
                  className="flex items-center gap-3 text-sm"
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: t.color }}
                    aria-hidden
                  />
                  <span className="w-24 shrink-0 font-medium">
                    {t.teamName}
                  </span>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        backgroundColor: t.color,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-600 dark:text-gray-300 w-20 text-right">
                    {pct}% ({t.correct}/{t.predicted})
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(review.factorInsights.best || review.factorInsights.worst) && (
        <section aria-labelledby="monthly-factors-title" className="space-y-3">
          <h2 id="monthly-factors-title" className="text-xl font-bold">
            팩터 인사이트
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {review.factorInsights.best && (
              <div className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-green-500/30 p-5">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
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

      {!review.hasData && (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center">
          <span className="text-5xl block mb-4">📆</span>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
            {range.label}에는 예측 데이터가 없습니다
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            다른 월 리뷰를 확인해주세요.
          </p>
        </section>
      )}

      {recent.length > 0 && (
        <section className="border-t border-gray-200 dark:border-[var(--color-border)] pt-6">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            최근 월간 리뷰
          </h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((m) => (
              <Link
                key={m.monthId}
                href={`/reviews/monthly/${m.monthId}`}
                className="text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-[var(--color-border)] hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                {m.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
