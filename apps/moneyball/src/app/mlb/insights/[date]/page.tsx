import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { mlbShortTeamName, SITE_URL } from "@moneyball/shared";
import { isValidInsightsDate } from "@/lib/insights/loader";
import { insightsStatusBadge } from "@/lib/insights/statusBadge";
import { selectTopFactors } from "@/lib/insights/topFactors";
import { getMlbInsightsForDate, listMlbInsightsDates } from "../insights-data";

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
    console.error("mlb/insights/[date] generateStaticParams failed, degrading to 0 pages:", err);
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  if (!isValidInsightsDate(date)) {
    return {
      title: "MLB AI 인사이트 — 잘못된 일자",
      robots: { index: false, follow: false },
    };
  }
  const pageUrl = `${SITE_URL}/mlb/insights/${date}`;
  return {
    title: `${date} MLB AI 인사이트`,
    description: `${date} MLB 경기 AI 심판 에이전트 reasoning 모음. 정량 모델 + 양팀 에이전트 토론 종합 분석.`,
    alternates: {
      canonical: pageUrl,
      languages: { en: `${SITE_URL}/en/mlb/insights/${date}`, ko: pageUrl },
    },
    openGraph: {
      title: `${date} MLB AI 인사이트 | MoneyBall Score`,
      description: `${date} MLB 경기 AI 심판 reasoning 모음`,
      url: pageUrl,
      type: "article",
      publishedTime: `${date}T00:00:00-04:00`,
      locale: "ko_KR",
    },
    twitter: {
      card: "summary_large_image",
      title: `${date} MLB AI 인사이트 | MoneyBall Score`,
      description: `${date} MLB 경기 AI 심판 reasoning 모음`,
    },
  };
}

export default async function MlbInsightsDatePage({ params }: Props) {
  const { date } = await params;
  if (!isValidInsightsDate(date)) notFound();
  const entries = await getMlbInsightsForDate(date);
  if (entries.length === 0) notFound();

  const pageUrl = `${SITE_URL}/mlb/insights/${date}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": pageUrl,
    headline: `${date} MoneyBall Score MLB AI 인사이트`,
    description: `${date} MLB 경기 AI 심판 에이전트 reasoning 모음. ${entries.length}경기 분석.`,
    url: pageUrl,
    inLanguage: "ko-KR",
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
          { label: "MLB 분석", href: "/mlb" },
          { label: "AI 인사이트", href: "/mlb/insights" },
          { label: date },
        ]}
      />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-brand-900 dark:text-brand-100">{date} MLB AI 인사이트</h1>
        <p className="text-gray-700 dark:text-brand-300 leading-relaxed">
          {date} MLB 경기의 AI 심판 에이전트가 남긴 reasoning 모음입니다. 정량 세이버메트릭스 모델 위에
          홈/원정 에이전트 토론 → 심판 종합 결과를 {entries.length}경기 보여드립니다.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          일자 경기 카드는{" "}
          <Link href={`/mlb/games/${date}`} className="text-brand-700 dark:text-brand-300 hover:underline">
            {date} 예측 페이지
          </Link>
          에서 확인하세요.
        </p>
      </header>

      <nav aria-label="관련 자료" className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/mlb/insights"
          className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          ← MLB AI 인사이트 hub
        </Link>
        <Link
          href={`/mlb/games/${date}`}
          className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          {date} 예측 페이지 →
        </Link>
        <Link
          href="/mlb/methodology"
          className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-brand-50 text-gray-700 hover:text-brand-700 dark:bg-gray-800 dark:hover:bg-brand-900 dark:text-gray-200 dark:hover:text-brand-200 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          예측 방법론 →
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
                    홈 승리확률 {Math.round(item.homeWinProb * 100)}%
                  </span>
                )}
                {item.isFallback && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-50 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
                    정량 모델 단독
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
                    상위 팩터 {topFactors.length}
                  </p>
                  <ul className="space-y-1 text-xs">
                    {topFactors.map((f) => {
                      const favorLabel =
                        f.favorable === "home"
                          ? `${homeName} 우위`
                          : f.favorable === "away"
                            ? `${awayName} 우위`
                            : "비슷";
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
          {date} MLB AI 인사이트는 ISR 24시간으로 갱신됩니다. 정량 모델 단독 표시는 에이전트 토론이 일시
          중단되어 정량 모델 결과만 노출된 경우입니다.
        </p>
      </footer>
    </div>
  );
}
