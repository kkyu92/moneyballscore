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

// /mlb/insights/series/[topic](KO) 의 EN mirror — plan #30 Phase 3, 문자열만 번역 +
// locale="en" 전파 (mlb/insights hub/[date] EN mirror 와 동일 패턴). 데이터 조회는
// insights-data.ts 공유(DRY).

interface Props {
  params: Promise<{ topic: string }>;
}

export const revalidate = 3600; // INSIGHTS_SERIES_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic: slug } = await params;
  const topic = parseMlbSeriesTopic(slug);
  if (!topic) {
    return {
      title: "MLB AI Insights — Series",
      robots: { index: false, follow: false },
    };
  }
  const team1Name = MLB_TEAMS[topic.team1].name;
  const team2Name = MLB_TEAMS[topic.team2].name;
  const pageUrl = `${SITE_URL}/en/mlb/insights/series/${topic.slug}`;
  const title = `${team1Name} vs ${team2Name} — MLB AI Insights Series`;
  const description = `Archive of AI judge agent reasoning for every ${team1Name} vs ${team2Name} game. Quant model + two-agent debate, synthesized by a judge.`;
  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: { en: pageUrl, ko: `${SITE_URL}/mlb/insights/series/${topic.slug}` },
    },
    openGraph: {
      title: `${title} | MoneyBall Score`,
      description,
      url: pageUrl,
      type: "article",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | MoneyBall Score`,
      description,
    },
  };
}

export default async function EnMlbSeriesTopicPage({ params }: Props) {
  const { topic: slug } = await params;
  const topic = parseMlbSeriesTopic(slug);
  if (!topic) notFound();

  const entries = await getMlbSeriesByTopic(topic);
  const team1Name = MLB_TEAMS[topic.team1].name;
  const team2Name = MLB_TEAMS[topic.team2].name;
  const pageUrl = `${SITE_URL}/en/mlb/insights/series/${topic.slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": pageUrl,
    headline: `${team1Name} vs ${team2Name} — MLB AI Insights Series`,
    description: `AI judge agent reasoning timeline across ${entries.length} ${team1Name} vs ${team2Name} games.`,
    url: pageUrl,
    inLanguage: "en-US",
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
          { label: "MLB Analysis", href: "/en/mlb" },
          { label: "AI Insights", href: "/en/mlb/insights" },
          { label: `${mlbShortTeamName(topic.team1)} vs ${mlbShortTeamName(topic.team2)} series` },
        ]}
        locale="en"
      />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-brand-900 dark:text-brand-100">
          {team1Name} vs {team2Name}
          <span className="block text-lg font-medium text-brand-500 dark:text-brand-300 mt-1">
            MLB AI Insights Series
          </span>
        </h1>
        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
          AI judge agent reasoning across every {team1Name} vs {team2Name} game — a quant sabermetrics
          model ({MLB_FACTOR_COUNTS.total} factors) feeding a home/away agent debate, synthesized by a
          judge, in reverse chronological order.
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>{entries.length} games total</span>
          {verifiedN > 0 && (
            <>
              <span>{verifiedN} verified</span>
              <span>{rate}% accuracy ({correctN}/{verifiedN})</span>
              {verifiedN < SMALL_SAMPLE_N && <span>· small sample (n&lt;{SMALL_SAMPLE_N}, reference only)</span>}
            </>
          )}
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-[var(--color-border)] p-8 text-center text-gray-500 dark:text-gray-400">
          No insights accumulated yet. This page updates automatically once the next {team1Name} vs{" "}
          {team2Name} game is published.
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
                      (home {Math.round(e.homeWinProb * 100)}%)
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
                    {e.isCorrect ? "Correct" : "Wrong"}
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

      <nav aria-label="Related resources" className="pt-6 border-t border-gray-200 dark:border-[var(--color-border)]">
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/en/mlb/insights"
            className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition"
          >
            ← All MLB AI Insights
          </Link>
          <Link
            href={`/en/mlb/team/${topic.team1}`}
            className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition"
          >
            {team1Name} →
          </Link>
          <Link
            href={`/en/mlb/team/${topic.team2}`}
            className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition"
          >
            {team2Name} →
          </Link>
        </div>
      </nav>
    </div>
  );
}
