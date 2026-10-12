import type { Metadata } from "next";
import Link from "next/link";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { mlbShortTeamName, INSIGHTS_ISR_HOURS, INSIGHTS_LIMIT, SITE_URL } from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { selectTopFactors } from "@/lib/insights/topFactors";
import { insightsStatusBadge } from "@/lib/insights/statusBadge";
import { captureFallback } from "@/lib/observability/captureFallback";
import { getRecentMlbInsights, type MlbInsightRow } from "@/app/mlb/insights/insights-data";

// /mlb/insights(KO) 의 EN mirror — 로직은 완전 동일, 문자열만 번역 + locale="en" prop
// 전파 (mlb/predictions EN mirror 와 동일 패턴). 데이터 조회는 insights-data.ts 공유(DRY,
// mlb/analysis/analysis-data.ts 가 en/mlb/analysis 와 공유하는 것과 동일 원칙).
const PAGE_URL = `${SITE_URL}/en/mlb/insights`;
const LIMIT = INSIGHTS_LIMIT;

export const metadata: Metadata = {
  title: "MLB AI Insights",
  description:
    "Archive of MLB AI judge agent reasoning, in reverse chronological order. Each game is analyzed by a pure quant sabermetrics model.",
  alternates: {
    canonical: PAGE_URL,
    languages: {
      en: PAGE_URL,
      ko: `${SITE_URL}/mlb/insights`,
    },
  },
  openGraph: {
    title: "MLB AI Insights | MoneyBall Score",
    description: "Archive of MLB AI judge agent reasoning, in reverse chronological order.",
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB AI Insights | MoneyBall Score",
    description: "Archive of MLB AI judge agent reasoning, in reverse chronological order.",
  },
};

export const revalidate = 86400; // INSIGHTS_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export default async function EnMlbInsightsHubPage() {
  const insightsR = await getRecentMlbInsights(LIMIT).then(
    (value) => ({ status: "fulfilled" as const, value }),
    (reason) => ({ status: "rejected" as const, reason }),
  );
  const insights = insightsR.status === "fulfilled"
    ? insightsR.value
    : captureFallback(insightsR.reason, [] as MlbInsightRow[], { route: "/en/mlb/insights", source: "getRecentMlbInsights" });
  const dbDegraded = insightsR.status === "rejected";
  const latestDate = insights[0]?.date ?? null;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": PAGE_URL,
    headline: "MoneyBall Score MLB AI Insights",
    description:
      "Archive of MLB AI judge agent reasoning. Pure quant model analysis.",
    url: PAGE_URL,
    inLanguage: "en-US",
    datePublished: "2026-09-29",
    dateModified: latestDate ?? "2026-09-29",
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
    mainEntityOfPage: PAGE_URL,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <Breadcrumb
        items={[{ label: "MLB Analysis", href: "/en/mlb" }, { label: "AI Insights" }]}
        locale="en"
      />

      {dbDegraded && (
        <div
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          Some information may be temporarily unavailable due to a service disruption. Please try again shortly.
        </div>
      )}

      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-brand-900 dark:text-brand-100">MLB AI Insights</h1>
        <p className="text-gray-700 dark:text-brand-300 leading-relaxed">
          A reverse-chronological archive of what our MLB AI judge agent wrote after each game.
          MLB is scored by a pure quant sabermetrics model ({MLB_FACTOR_COUNTS.total} factors) —
          unlike KBO, it does not go through an LLM debate layer.
        </p>
        <p className="text-sm text-gray-500 dark:text-brand-300/70">
          Showing the latest {insights.length}. Tap a date to see all predictions for that day.
        </p>
      </header>

      <nav aria-label="Related resources" className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/en/mlb/methodology"
          className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          Methodology →
        </Link>
        <Link
          href="/en/mlb/accuracy"
          className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          Accuracy dashboard →
        </Link>
      </nav>

      {insights.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-[var(--color-border)] p-8 text-center text-gray-500 dark:text-gray-400">
          No AI insights yet. They will appear automatically once judge agent analysis is
          published for MLB games.
        </div>
      ) : (
        <ol className="space-y-4">
          {insights.map((item) => {
            const badge = insightsStatusBadge(item.status, item.isCorrect);
            const homeName = mlbShortTeamName(item.homeTeam);
            const awayName = mlbShortTeamName(item.awayTeam);
            const topFactors = selectTopFactors(item.factors);
            return (
              <li
                key={`${item.gameId}-${item.date}`}
                className="rounded-xl border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-card)] p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Link
                    href={`/en/mlb/games/${item.date}`}
                    className="font-semibold text-brand-700 dark:text-brand-300 hover:underline"
                  >
                    {item.date}
                  </Link>
                  <span className="text-gray-700 dark:text-gray-200">
                    {awayName} vs {homeName}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                  {item.homeWinProb !== null && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Home win prob {Math.round(item.homeWinProb * 100)}%
                    </span>
                  )}
                  {item.isFallback && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-50 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
                      Quant model only
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {item.reasoningText}
                </p>
                {topFactors.length > 0 && (
                  <div
                    data-mini-factor-preview
                    className="pt-3 border-t border-gray-100 dark:border-[var(--color-border)] space-y-1.5"
                  >
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Top {topFactors.length} factors
                    </p>
                    <ul className="space-y-1 text-xs">
                      {topFactors.map((f) => {
                        const favorLabel =
                          f.favorable === "home"
                            ? `${homeName} favored`
                            : f.favorable === "away"
                              ? `${awayName} favored`
                              : "Even";
                        const favorColor =
                          f.favorable === "home"
                            ? "text-brand-600 dark:text-brand-300"
                            : f.favorable === "away"
                              ? "text-[var(--color-away)]"
                              : "text-gray-500 dark:text-gray-400";
                        return (
                          <li key={f.key} className="flex items-center gap-2">
                            <span className="w-20 shrink-0 text-gray-700 dark:text-gray-300">
                              {f.label}
                            </span>
                            <span className={`font-medium whitespace-nowrap ${favorColor}`}>
                              {favorLabel}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">
                              ({f.pct}%)
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <div className="text-xs flex flex-wrap gap-x-4 gap-y-1">
                  <Link
                    href={`/en/mlb/games/${item.date}`}
                    className="text-brand-600 dark:text-brand-300 hover:underline"
                  >
                    See all predictions for this date →
                  </Link>
                  {topFactors.length > 0 && (
                    <Link
                      href={`/en/mlb/insights/${item.date}#factor-breakdown-${item.gameId}`}
                      className="text-brand-600 dark:text-brand-300 hover:underline"
                    >
                      View all factors →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <footer className="pt-6 border-t border-gray-200 dark:border-[var(--color-border)] text-sm text-gray-500 dark:text-gray-400 space-y-2">
        <p>
          MLB AI Insights refreshes automatically every day ({INSIGHTS_ISR_HOURS}h ISR). MLB has
          no LLM debate layer, so every analysis is quant-model-only (see Methodology for details).
        </p>
      </footer>
    </div>
  );
}
