import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { mlbShortTeamName, SITE_URL } from "@moneyball/shared";
import { isValidInsightsDate } from "@/lib/insights/loader";
import { insightsStatusBadge } from "@/lib/insights/statusBadge";
import { selectTopFactors } from "@/lib/insights/topFactors";
import { getMlbInsightsForDate, listMlbInsightsDates } from "@/app/mlb/insights/insights-data";

// /mlb/insights/[date](KO) 의 EN mirror — plan #30 Phase 2, 문자열만 번역 + locale="en"
// 전파 (mlb/insights hub EN mirror 와 동일 패턴). 데이터 조회는 insights-data.ts 공유(DRY).

interface Props {
  params: Promise<{ date: string }>;
}

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = 86400; // INSIGHTS_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export async function generateStaticParams() {
  // DB 장애(예: Supabase egress quota, cycle 2939)가 이 선택적 아카이브 feature 의
  // 빌드를 넘어 전체 production 빌드를 죽이면 안 됨 — 0건으로 degrade (fix-incident cycle 2945).
  try {
    const dates = await listMlbInsightsDates(90);
    return dates.map((date) => ({ date }));
  } catch (err) {
    console.error("en/mlb/insights/[date] generateStaticParams failed, degrading to 0 pages:", err);
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  if (!isValidInsightsDate(date)) {
    return {
      title: "MLB AI Insights — Invalid Date",
      robots: { index: false, follow: false },
    };
  }
  const pageUrl = `${SITE_URL}/en/mlb/insights/${date}`;
  return {
    title: `${date} MLB AI Insights`,
    description: `Archive of AI judge agent reasoning for MLB games on ${date}. Quant model + two-agent debate, synthesized by a judge.`,
    alternates: {
      canonical: pageUrl,
      languages: { en: pageUrl, ko: `${SITE_URL}/mlb/insights/${date}` },
    },
    openGraph: {
      title: `${date} MLB AI Insights | MoneyBall Score`,
      description: `Archive of AI judge agent reasoning for MLB games on ${date}.`,
      url: pageUrl,
      type: "article",
      publishedTime: `${date}T00:00:00-04:00`,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${date} MLB AI Insights | MoneyBall Score`,
      description: `Archive of AI judge agent reasoning for MLB games on ${date}.`,
    },
  };
}

export default async function EnMlbInsightsDatePage({ params }: Props) {
  const { date } = await params;
  if (!isValidInsightsDate(date)) notFound();
  const entries = await getMlbInsightsForDate(date);
  if (entries.length === 0) notFound();

  const pageUrl = `${SITE_URL}/en/mlb/insights/${date}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": pageUrl,
    headline: `${date} MoneyBall Score MLB AI Insights`,
    description: `Archive of AI judge agent reasoning for MLB games on ${date}. ${entries.length} games analyzed.`,
    url: pageUrl,
    inLanguage: "en-US",
    datePublished: `${date}T00:00:00-04:00`,
    dateModified: `${date}T00:00:00-04:00`,
    author: { "@type": "Organization", name: "MoneyBall Score", url: SITE_URL },
    publisher: { "@type": "Organization", name: "MoneyBall Score", url: SITE_URL },
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
          { label: "MLB Analysis", href: "/en/mlb" },
          { label: "AI Insights", href: "/en/mlb/insights" },
          { label: date },
        ]}
        locale="en"
      />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-brand-900 dark:text-brand-100">{date} MLB AI Insights</h1>
        <p className="text-gray-700 dark:text-brand-300 leading-relaxed">
          What our MLB AI judge agent wrote for {date} games — a quant sabermetrics model feeding a
          home/away agent debate, synthesized by a judge, across {entries.length} games.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          See the full slate of predictions on the{" "}
          <Link href={`/en/mlb/games/${date}`} className="text-brand-700 dark:text-brand-300 hover:underline">
            {date} predictions page
          </Link>
          .
        </p>
      </header>

      <nav aria-label="Related resources" className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/en/mlb/insights"
          className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          ← MLB AI Insights hub
        </Link>
        <Link
          href={`/en/mlb/games/${date}`}
          className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          {date} predictions →
        </Link>
        <Link
          href="/en/mlb/methodology"
          className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          Methodology →
        </Link>
      </nav>

      <ol className="space-y-6">
        {entries.map((item) => {
          const badge = insightsStatusBadge(item.status, item.isCorrect);
          const homeName = mlbShortTeamName(item.homeTeam);
          const awayName = mlbShortTeamName(item.awayTeam);
          const topFactors = selectTopFactors(item.factors);
          return (
            <li
              key={item.gameId}
              id={`factor-breakdown-${item.gameId}`}
              className="scroll-mt-20 rounded-xl border border-gray-200 dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-card)] p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold text-brand-900 dark:text-brand-100">
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
                          <span className="w-20 shrink-0 text-gray-700 dark:text-gray-300">{f.label}</span>
                          <span className={`font-medium whitespace-nowrap ${favorColor}`}>{favorLabel}</span>
                          <span className="text-gray-400 dark:text-gray-500">({f.pct}%)</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <footer className="pt-6 border-t border-gray-200 dark:border-[var(--color-border)] text-sm text-gray-500 dark:text-gray-400 space-y-2">
        <p>
          MLB AI Insights for {date} refreshes on a 24h ISR cycle. &quot;Quant model only&quot; means the
          agent debate was temporarily unavailable and only the quant model result is shown.
        </p>
      </footer>
    </div>
  );
}
