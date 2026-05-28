import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { KBO_TEAMS, shortTeamName } from "@moneyball/shared";
import {
  getSeriesByTopic,
  listSeriesTopics,
  parseSeriesTopic,
} from "@/lib/insights/series";
import {
  SITE_URL,
  buildArticleJsonLd,
  buildBreadcrumbListJsonLd,
} from "@/lib/seo/json-ld";

interface Props {
  params: Promise<{ topic: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 3600;

export async function generateStaticParams() {
  return listSeriesTopics().map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic: slug } = await params;
  const topic = parseSeriesTopic(slug);
  if (!topic) {
    return {
      title: "AI 인사이트 — 시리즈",
      robots: { index: false, follow: false },
    };
  }
  const team1Name = KBO_TEAMS[topic.team1].name;
  const team2Name = KBO_TEAMS[topic.team2].name;
  const pageUrl = `${SITE_URL}/insights/series/${topic.slug}`;
  const title = `${team1Name} vs ${team2Name} — AI 인사이트 시리즈`;
  const description = `${team1Name}와 ${team2Name}의 모든 경기에 대한 AI 심판 reasoning 시계열 아카이브. 정량 모델 + 양팀 에이전트 토론 + 심판 종합.`;
  return {
    title,
    description,
    alternates: { canonical: pageUrl },
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

export default async function SeriesTopicPage({ params }: Props) {
  const { topic: slug } = await params;
  const topic = parseSeriesTopic(slug);
  if (!topic) notFound();

  const entries = await getSeriesByTopic(topic);
  const team1Name = KBO_TEAMS[topic.team1].name;
  const team2Name = KBO_TEAMS[topic.team2].name;
  const pageUrl = `${SITE_URL}/insights/series/${topic.slug}`;

  const articleLd = buildArticleJsonLd({
    url: pageUrl,
    headline: `${team1Name} vs ${team2Name} — AI 인사이트 시리즈`,
    description: `${team1Name}와 ${team2Name}의 ${entries.length}경기 AI 심판 reasoning 시계열.`,
    datePublished: entries[entries.length - 1]?.date ?? "2026-05-28",
    dateModified: entries[0]?.date ?? "2026-05-28",
  });
  const breadcrumbLd = buildBreadcrumbListJsonLd([
    { name: "홈", url: SITE_URL },
    { name: "AI 인사이트", url: `${SITE_URL}/insights` },
    { name: `${team1Name} vs ${team2Name}`, url: pageUrl },
  ]);

  const correctN = entries.filter((e) => e.isCorrect === true).length;
  const wrongN = entries.filter((e) => e.isCorrect === false).length;
  const verifiedN = correctN + wrongN;
  const rate = verifiedN > 0 ? Math.round((correctN / verifiedN) * 100) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <Breadcrumb
        items={[
          { href: "/insights", label: "AI 인사이트" },
          { label: `${shortTeamName(topic.team1)} vs ${shortTeamName(topic.team2)} 시리즈` },
        ]}
      />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-brand-700 dark:text-brand-100">
          {team1Name} vs {team2Name}
          <span className="block text-lg font-medium text-brand-500 dark:text-brand-300 mt-1">
            AI 인사이트 시리즈
          </span>
        </h1>
        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
          {team1Name}와 {team2Name}의 모든 경기에 대한 AI 심판 에이전트 reasoning 시계열입니다.
          정량 세이버메트릭스 모델 (10팩터) + 홈/원정 에이전트 토론 + 심판 종합 결과를 시간 역순으로 모았습니다.
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>총 {entries.length}경기</span>
          {verifiedN > 0 && (
            <>
              <span>검증 {verifiedN}경기</span>
              <span>적중률 {rate}% ({correctN}/{verifiedN})</span>
            </>
          )}
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          아직 누적된 인사이트가 없습니다. 다음 {team1Name} vs {team2Name} 경기가 발행되면 자동으로 표시됩니다.
        </div>
      ) : (
        <ol className="space-y-4">
          {entries.map((e) => (
            <li
              key={e.gameId}
              className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[var(--color-surface-card)] p-5 space-y-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
                <Link
                  href={`/analysis/game/${e.gameId}`}
                  className="font-mono text-brand-600 dark:text-brand-300 hover:underline"
                >
                  {e.date}
                </Link>
                <span className="text-gray-600 dark:text-gray-400">
                  {shortTeamName(e.awayTeam)} @ {shortTeamName(e.homeTeam)}
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

      <nav aria-label="관련 자료" className="pt-6 border-t border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/insights"
            className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition"
          >
            ← 전체 AI 인사이트
          </Link>
          <Link
            href={`/teams/${topic.team1.toLowerCase()}`}
            className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition"
          >
            {team1Name} 팀 →
          </Link>
          <Link
            href={`/teams/${topic.team2.toLowerCase()}`}
            className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition"
          >
            {team2Name} 팀 →
          </Link>
        </div>
      </nav>
    </div>
  );
}
