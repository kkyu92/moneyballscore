import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { MLB_TEAMS, SITE_URL, SMALL_SAMPLE_N, mlbShortTeamName } from "@moneyball/shared";
import {
  getMlbSeriesByTopic,
  parseMlbSeriesTopic,
} from "@/app/mlb/insights/insights-data";

// /insights/series/[topic](KBO) 의 MLB 이식 — plan #30 Phase 3. generateStaticParams
// 없음(mlb/matchup/[teamA]/[teamB] 선례 재사용, 435쌍 전체 사전렌더 빌드비용 회피) — on-demand
// ISR 로 첫 요청 시 렌더 후 캐시.

interface Props {
  params: Promise<{ topic: string }>;
}

export const revalidate = 3600; // INSIGHTS_SERIES_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic: slug } = await params;
  const topic = parseMlbSeriesTopic(slug);
  if (!topic) {
    return {
      title: "MLB AI 인사이트 — 시리즈",
      robots: { index: false, follow: false },
    };
  }
  const team1Name = MLB_TEAMS[topic.team1].name;
  const team2Name = MLB_TEAMS[topic.team2].name;
  const pageUrl = `${SITE_URL}/mlb/insights/series/${topic.slug}`;
  const title = `${team1Name} vs ${team2Name} — MLB AI 인사이트 시리즈`;
  const description = `${team1Name}와 ${team2Name}의 모든 경기에 대한 AI 심판 reasoning 시계열 아카이브. 정량 모델 + 양팀 에이전트 토론 + 심판 종합.`;
  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: { en: `${SITE_URL}/en/mlb/insights/series/${topic.slug}`, ko: pageUrl },
    },
    openGraph: {
      title: `${title} | MoneyBall Score`,
      description,
      url: pageUrl,
      type: "article",
      locale: "ko_KR",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | MoneyBall Score`,
      description,
    },
  };
}

export default async function MlbSeriesTopicPage({ params }: Props) {
  const { topic: slug } = await params;
  const topic = parseMlbSeriesTopic(slug);
  if (!topic) notFound();

  const entries = await getMlbSeriesByTopic(topic);
  const team1Name = MLB_TEAMS[topic.team1].name;
  const team2Name = MLB_TEAMS[topic.team2].name;
  const pageUrl = `${SITE_URL}/mlb/insights/series/${topic.slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": pageUrl,
    headline: `${team1Name} vs ${team2Name} — MLB AI 인사이트 시리즈`,
    description: `${team1Name}와 ${team2Name}의 ${entries.length}경기 AI 심판 reasoning 시계열.`,
    url: pageUrl,
    inLanguage: "ko-KR",
    datePublished: entries[entries.length - 1]?.date ?? "2026-09-29",
    dateModified: entries[0]?.date ?? "2026-09-29",
    author: { "@type": "Organization", name: "MoneyBall Score", url: SITE_URL },
    publisher: { "@type": "Organization", name: "MoneyBall Score", url: SITE_URL },
    mainEntityOfPage: pageUrl,
  };

  const correctN = entries.filter((e) => e.isCorrect === true).length;
  const wrongN = entries.filter((e) => e.isCorrect === false).length;
  const verifiedN = correctN + wrongN;
  const rate = verifiedN > 0 ? Math.round((correctN / verifiedN) * 100) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <Breadcrumb
        items={[
          { label: "MLB 분석", href: "/mlb" },
          { label: "AI 인사이트", href: "/mlb/insights" },
          { label: `${mlbShortTeamName(topic.team1)} vs ${mlbShortTeamName(topic.team2)} 시리즈` },
        ]}
      />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-brand-900 dark:text-brand-100">
          {team1Name} vs {team2Name}
          <span className="block text-lg font-medium text-brand-500 dark:text-brand-300 mt-1">
            MLB AI 인사이트 시리즈
          </span>
        </h1>
        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
          {team1Name}와 {team2Name}의 모든 경기에 대한 AI 심판 에이전트 reasoning 시계열입니다.
          정량 세이버메트릭스 모델 ({MLB_FACTOR_COUNTS.total}팩터) + 홈/원정 에이전트 토론 + 심판 종합
          결과를 시간 역순으로 모았습니다.
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>총 {entries.length}경기</span>
          {verifiedN > 0 && (
            <>
              <span>검증 {verifiedN}경기</span>
              <span>적중률 {rate}% ({correctN}/{verifiedN})</span>
              {verifiedN < SMALL_SAMPLE_N && (
                <span>· 소표본(n&lt;{SMALL_SAMPLE_N}, 참고용)</span>
              )}
            </>
          )}
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-[var(--color-border)] p-8 text-center text-gray-500 dark:text-gray-400">
          아직 누적된 인사이트가 없습니다. 다음 {team1Name} vs {team2Name} 경기가 발행되면 자동으로
          표시됩니다.
        </div>
      ) : (
        <ol className="space-y-4">
          {entries.map((e) => (
            <li
              key={e.gameId}
              className="rounded-lg border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-card)] p-5 space-y-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
                <span className="font-mono text-brand-600 dark:text-brand-300">{e.date}</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {mlbShortTeamName(e.awayTeam)} @ {mlbShortTeamName(e.homeTeam)}
                  {e.homeWinProb != null && (
                    <span className="ml-2 text-xs font-mono">
                      (홈 {Math.round(e.homeWinProb * 100)}%)
                    </span>
                  )}
                </span>
                {e.isCorrect !== null && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      e.isCorrect
                        ? "bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {e.isCorrect ? "적중" : "오답"}
                  </span>
                )}
              </div>
              <p
                className={`text-sm leading-relaxed ${
                  e.isFallback
                    ? "text-gray-500 dark:text-gray-400 italic"
                    : "text-gray-800 dark:text-gray-200"
                }`}
              >
                {e.reasoningText}
              </p>
            </li>
          ))}
        </ol>
      )}

      <nav aria-label="관련 자료" className="pt-6 border-t border-gray-200 dark:border-[var(--color-border)]">
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/mlb/insights"
            className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition"
          >
            ← 전체 MLB AI 인사이트
          </Link>
          <Link
            href={`/mlb/team/${topic.team1}`}
            className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition"
          >
            {team1Name} 팀 →
          </Link>
          <Link
            href={`/mlb/team/${topic.team2}`}
            className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition"
          >
            {team2Name} 팀 →
          </Link>
        </div>
      </nav>
    </div>
  );
}
