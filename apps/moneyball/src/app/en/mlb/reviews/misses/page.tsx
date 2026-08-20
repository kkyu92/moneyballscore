import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { MISS_REPORT_LIMIT, SITE_URL } from "@moneyball/shared";
import { buildMlbMissReport } from "@/lib/reviews/mlb-shared";
import { ShareButtons } from "@/components/share/ShareButtons";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { MissesSortControl } from "@/components/reviews/MissesSortControl";

// en/mlb/reviews/misses (wave-659, cycle 2339) — KO /mlb/reviews/misses 미러.
const PAGE_URL = `${SITE_URL}/en/mlb/reviews/misses`;

export const metadata: Metadata = {
  title: "MLB Retrospective: Missed Predictions | MoneyBall Score",
  description:
    "A collection of high-confidence MLB predictions MoneyBall Score's model got wrong. See which factors most strongly (and wrongly) backed each prediction.",
  robots: { index: true, follow: true },
  alternates: {
    canonical: PAGE_URL,
    languages: { en: PAGE_URL, ko: `${SITE_URL}/mlb/reviews/misses` },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: PAGE_URL,
    siteName: "MoneyBall Score",
    title: "MLB Retrospective: Missed Predictions | MoneyBall Score",
    description: "High-confidence MLB misses — factor analysis behind each wrong prediction.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB Retrospective: Missed Predictions | MoneyBall Score",
    description: "Factor analysis behind MoneyBall Score's high-confidence MLB misses.",
  },
};

export const revalidate = 1800; // MLB_LIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export default async function MlbMissesReviewPageEn() {
  const items = await buildMlbMissReport({ limit: MISS_REPORT_LIMIT, locale: "en" });

  const dateRankMap = new Map<string, number>();
  [...items]
    .sort((a, b) => b.gameDate.localeCompare(a.gameDate))
    .forEach((item, idx) => dateRankMap.set(item.externalGameId, idx));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `MLB Retrospective: Top ${MISS_REPORT_LIMIT} Missed Predictions`,
    description: "A collection of high-confidence MLB predictions MoneyBall Score's model got wrong.",
    datePublished: new Date().toISOString(),
    publisher: { "@type": "Organization", name: "MoneyBall Score" },
    mainEntityOfPage: PAGE_URL,
    inLanguage: "en-US",
  };

  return (
    <article className="max-w-4xl mx-auto space-y-6 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb
        items={[{ href: "/en/mlb/reviews", label: "MLB Prediction Review" }, { label: "Missed Predictions" }]}
        locale="en"
      />

      <header className="space-y-3 border-b border-gray-200 dark:border-[var(--color-border)] pb-5">
        <h1 className="text-3xl md:text-4xl font-bold">MLB Retrospective: Missed Predictions</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          We don&apos;t hide the high-confidence predictions our MLB model got wrong. MLB doesn&apos;t
          yet have a post-hoc judge agent like KBO, so instead of a narrative diagnosis, we show a
          quantitative breakdown of which factors most strongly backed the (wrong) predicted direction.
        </p>
      </header>

      {items.length === 0 ? (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center">
          <span className="text-5xl block mb-4">🧭</span>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
            No high-confidence misses yet
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            These will accumulate naturally as the season progresses.
          </p>
        </section>
      ) : (
        <>
          <MissesSortControl locale="en" />
          <div className="space-y-5" data-misses-list>
            {items.map((item) => {
              const predName = item.predictedHomeWin ? item.homeName : item.awayName;
              const actualName =
                (item.homeScore ?? 0) > (item.awayScore ?? 0) ? item.homeName : item.awayName;
              const confPct = Math.round(item.winnerProb * 100);
              const cardStyle = {
                "--mb-miss-date-order": dateRankMap.get(item.externalGameId) ?? 0,
              } as CSSProperties;

              return (
                <Link
                  href={`/en/mlb/games/${item.gameDate}/${item.homeCode}-vs-${item.awayCode}`}
                  key={item.externalGameId}
                  style={cardStyle}
                  className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 hover:border-brand-500/50 hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {item.gameDate}
                      </p>
                      <p className="text-lg font-bold mt-1">
                        {item.awayName}
                        <span className="font-mono mx-2 text-gray-500 dark:text-gray-400">
                          {item.awayScore ?? "-"} : {item.homeScore ?? "-"}
                        </span>
                        {item.homeName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        Predicted <strong>{predName}</strong> ({confPct}%) → Actual winner{" "}
                        <strong>{actualName}</strong>
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-300 shrink-0">
                      High-confidence miss
                    </span>
                  </div>

                  {item.topSupportingFactors.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                        Factors that backed this prediction
                      </p>
                      <ul className="flex flex-wrap gap-2">
                        {item.topSupportingFactors.map((fs) => (
                          <li
                            key={fs.factor}
                            className="text-xs px-2 py-1 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-300"
                          >
                            {fs.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-xs text-brand-500 pt-1">→ View game details</p>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <footer className="border-t border-gray-200 dark:border-[var(--color-border)] pt-4">
        <ShareButtons
          url={PAGE_URL}
          title={`MLB Retrospective: Top ${MISS_REPORT_LIMIT} Missed Predictions`}
          text="High-confidence MLB predictions MoneyBall Score's model got wrong — with factor analysis."
        />
      </footer>
    </article>
  );
}
