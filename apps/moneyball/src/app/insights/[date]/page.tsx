import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { JudgeReasoningCard } from "@/components/predictions/JudgeReasoningCard";
import { FactorBreakdown } from "@/components/predictions/FactorBreakdown";
import { DebateTimeline } from "@/components/insights/DebateTimeline";
import { KBO_FACTOR_COUNT, shortTeamName, INSIGHTS_ISR_HOURS, INSIGHTS_ISR_SECONDS, SITE_URL } from "@moneyball/shared";
import {
  getInsightsForDate,
  isValidInsightsDate,
  listInsightsDates,
} from "@/lib/insights/loader";
import { insightsStatusBadge } from "@/lib/insights/statusBadge";

interface Props {
  params: Promise<{ date: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = INSIGHTS_ISR_SECONDS;

export async function generateStaticParams() {
  const dates = await listInsightsDates(90);
  return dates.map((date) => ({ date }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  if (!isValidInsightsDate(date)) {
    return {
      title: "AI 인사이트 — 잘못된 일자",
      robots: { index: false, follow: false },
    };
  }
  const pageUrl = `${SITE_URL}/insights/${date}`;
  return {
    title: `${date} AI 인사이트`,
    description: `${date} KBO 경기 AI 심판 에이전트 reasoning 모음. 정량 모델 + 양팀 에이전트 토론 종합 분석.`,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: `${date} AI 인사이트 | MoneyBall Score`,
      description: `${date} KBO 경기 AI 심판 reasoning 모음`,
      url: pageUrl,
      type: "article",
      publishedTime: `${date}T00:00:00+09:00`,
      locale: "ko_KR",
    },
    twitter: {
      card: "summary_large_image",
      title: `${date} AI 인사이트 | MoneyBall Score`,
      description: `${date} KBO 경기 AI 심판 reasoning 모음`,
    },
  };
}

export default async function InsightsDatePage({ params }: Props) {
  const { date } = await params;
  if (!isValidInsightsDate(date)) notFound();
  const entries = await getInsightsForDate(date);
  if (entries.length === 0) notFound();

  const pageUrl = `${SITE_URL}/insights/${date}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": pageUrl,
    headline: `${date} MoneyBall Score AI 인사이트`,
    description: `${date} KBO 경기 AI 심판 에이전트 reasoning 모음. ${entries.length}경기 분석.`,
    url: pageUrl,
    inLanguage: "ko-KR",
    datePublished: `${date}T00:00:00+09:00`,
    dateModified: `${date}T00:00:00+09:00`,
    author: {
      "@type": "Organization",
      name: "MoneyBall Score",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "MoneyBall Score",
      url: SITE_URL,
    },
    mainEntityOfPage: pageUrl,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <Breadcrumb
        items={[
          { label: "AI 인사이트", href: "/insights" },
          { label: date },
        ]}
      />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{date} AI 인사이트</h1>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          {date} KBO 경기의 AI 심판 에이전트가 남긴 reasoning 모음입니다.
          정량 세이버메트릭스 모델 ({KBO_FACTOR_COUNT}팩터) 위에 홈/원정 에이전트 토론 → 심판 종합 결과를
          {entries.length}경기 보여드립니다.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          전체 reasoning + 양팀 에이전트 요약. 일자 경기 카드는 {" "}
          <Link href={`/predictions/${date}`} className="text-brand-700 dark:text-brand-300 hover:underline">
            {date} 예측 페이지
          </Link>
          에서 확인하세요.
        </p>
      </header>

      <nav aria-label="관련 자료" className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/insights"
          className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          ← AI 인사이트 hub
        </Link>
        <Link
          href={`/predictions/${date}`}
          className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          {date} 예측 페이지 →
        </Link>
        <Link
          href="/methodology"
          className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          예측 방법론 →
        </Link>
      </nav>

      <ol className="space-y-6">
        {entries.map((item) => {
          const badge = insightsStatusBadge(item.status, item.isCorrect);
          const homeName = shortTeamName(item.homeTeam);
          const awayName = shortTeamName(item.awayTeam);
          return (
            <li
              key={item.gameId}
              id={`game-${item.gameId}`}
              className="scroll-mt-20 rounded-xl border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-card)] p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {awayName} vs {homeName}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
                {item.homeWinProb !== null && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    홈 승리확률 {Math.round(item.homeWinProb * 100)}%
                  </span>
                )}
                <Link
                  href={`/analysis/game/${item.gameId}`}
                  className="ml-auto text-xs text-brand-600 dark:text-brand-300 hover:underline"
                >
                  경기 분석 →
                </Link>
              </div>
              {item.debate ? (
                <>
                  <DebateTimeline
                    homeTeam={item.homeTeam}
                    awayTeam={item.awayTeam}
                    debate={item.debate}
                  />
                  <details className="group rounded-lg border border-gray-200 dark:border-[var(--color-border)] bg-gray-50 dark:bg-[var(--color-surface)] open:bg-white dark:open:bg-[var(--color-surface-card)]">
                    <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 select-none list-none flex items-center gap-2">
                      <span aria-hidden className="inline-block transition-transform group-open:rotate-90">▶</span>
                      심판 reasoning 원문 + 양팀 논거 요약
                    </summary>
                    <div className="px-4 pb-4 pt-2">
                      <JudgeReasoningCard
                        homeTeam={item.homeTeam}
                        awayTeam={item.awayTeam}
                        judgeReasoning={item.reasoningText}
                        homeArgSummary={item.homeArgSummary}
                        awayArgSummary={item.awayArgSummary}
                        isQuantOnlyFallback={item.isFallback}
                      />
                    </div>
                  </details>
                </>
              ) : (
                <JudgeReasoningCard
                  homeTeam={item.homeTeam}
                  awayTeam={item.awayTeam}
                  judgeReasoning={item.reasoningText}
                  homeArgSummary={item.homeArgSummary}
                  awayArgSummary={item.awayArgSummary}
                  isQuantOnlyFallback={item.isFallback}
                />
              )}
              {item.factors && (
                <FactorBreakdown
                  factors={item.factors}
                  homeTeam={item.homeTeam}
                  awayTeam={item.awayTeam}
                  gameId={item.gameId}
                  chart
                />
              )}
            </li>
          );
        })}
      </ol>

      <footer className="pt-6 border-t border-gray-200 dark:border-[var(--color-border)] text-sm text-gray-500 dark:text-gray-400 space-y-2">
        <p>
          {date} AI 인사이트는 ISR {INSIGHTS_ISR_HOURS}시간으로 갱신됩니다. 정량 모델 단독 표시는 에이전트 토론이 일시
          중단되어 정량 모델 결과만 노출된 경우입니다.
        </p>
      </footer>
    </div>
  );
}
