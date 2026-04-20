import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { KBO_TEAMS, shortTeamName } from '@moneyball/shared';
import { parseWeekId, getRecentWeeks } from "@/lib/reviews/computeWeekRange";
import {
  buildWeeklyReview,
  type WeeklyHighlight,
} from "@/lib/reviews/buildWeeklyReview";
import { ShareButtons } from "@/components/share/ShareButtons";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TeamLogo } from "@/components/shared/TeamLogo";

export const revalidate = 1800;

interface PageProps {
  params: Promise<{ week: string }>;
}

const SITE_URL = "https://moneyballscore.vercel.app";

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
  };
}

function HighlightCard({ h }: { h: WeeklyHighlight }) {
  const winnerName = h.predictedWinnerCode
    ? shortTeamName(h.predictedWinnerCode)
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
        예측 {winnerName ?? ""} {Math.round(h.confidence * 100)}%{" "}
        · {h.isCorrect ? "적중" : "빗나감"}
      </p>
    </Link>
  );
}

export default async function WeeklyReviewPage({ params }: PageProps) {
  const { week } = await params;
  const range = parseWeekId(week);
  if (!range) notFound();

  const review = await buildWeeklyReview(range);
  const url = `${SITE_URL}/reviews/weekly/${week}`;

  const recent = getRecentWeeks(4)
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
        </section>
      )}

      {review.highlights.length > 0 && (
        <section aria-labelledby="weekly-highlights-title" className="space-y-4">
          <h2 id="weekly-highlights-title" className="text-xl font-bold">
            하이라이트 경기
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {review.highlights.map((h) => (
              <HighlightCard key={h.gameId} h={h} />
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
              return (
                <div
                  key={t.teamCode}
                  className="flex items-center gap-3 text-sm"
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
        <section aria-labelledby="weekly-factors-title" className="space-y-3">
          <h2 id="weekly-factors-title" className="text-xl font-bold">
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
