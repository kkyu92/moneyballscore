import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { MISS_REPORT_LIMIT, SITE_URL } from "@moneyball/shared";
import { buildMlbMissReport } from "@/lib/reviews/mlb-shared";
import { ShareButtons } from "@/components/share/ShareButtons";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { MissesSortControl } from "@/components/reviews/MissesSortControl";

const PAGE_URL = `${SITE_URL}/mlb/reviews/misses`;

export const metadata: Metadata = {
  title: "MLB 회고: 크게 빗나간 예측",
  description:
    "MoneyBall Score MLB 모델이 고확신으로 틀렸던 예측 모음. 어떤 팩터가 (틀린) 예측을 가장 강하게 뒷받침했는지 공개.",
  robots: { index: true, follow: true },
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: PAGE_URL,
    siteName: "MoneyBall Score",
    title: "MLB 회고: 크게 빗나간 예측 | MoneyBall Score",
    description: "MLB 모델이 고확신으로 틀렸던 예측 — 예측을 뒷받침했던 팩터 공개.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB 회고: 크게 빗나간 예측 | MoneyBall Score",
    description: "고확신으로 틀렸던 MLB 예측의 팩터 분석.",
  },
};

export const revalidate = 1800; // MLB_LIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export default async function MlbMissesReviewPage() {
  const items = await buildMlbMissReport({ limit: MISS_REPORT_LIMIT });

  // reviews/misses(KBO) 대응 — 날짜 desc 순위 계산, '최신순' 토글용 CSS var.
  const dateRankMap = new Map<string, number>();
  [...items]
    .sort((a, b) => b.gameDate.localeCompare(a.gameDate))
    .forEach((item, idx) => dateRankMap.set(item.externalGameId, idx));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `MLB 회고: 크게 빗나간 예측 Top ${MISS_REPORT_LIMIT}`,
    description: "MoneyBall Score MLB 모델이 고확신으로 틀렸던 예측들의 팩터 분석 모음",
    datePublished: new Date().toISOString(),
    publisher: { "@type": "Organization", name: "MoneyBall Score" },
    mainEntityOfPage: PAGE_URL,
    inLanguage: "ko-KR",
  };

  return (
    <article className="max-w-4xl mx-auto space-y-6 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb items={[{ href: "/mlb/reviews", label: "MLB 예측 결과 리뷰" }, { label: "크게 빗나간 예측" }]} />

      <header className="space-y-3 border-b border-gray-200 dark:border-[var(--color-border)] pb-5">
        <h1 className="text-3xl md:text-4xl font-bold">MLB 회고: 크게 빗나간 예측</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          MLB 모델이 고확신으로 틀렸던 예측을 숨기지 않고 공개합니다. MLB 는 아직
          사후 심판 에이전트가 없어 KBO 회고와 달리 서술형 진단 대신, 어떤
          팩터가 (틀린) 예측 방향을 가장 강하게 뒷받침했는지 정량 계산으로
          보여줍니다.
        </p>
      </header>

      {items.length === 0 ? (
        <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-10 text-center">
          <span className="text-5xl block mb-4">🧭</span>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
            고확신으로 빗나간 예측이 아직 없습니다
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            시즌이 진행되면 자연스럽게 쌓입니다.
          </p>
        </section>
      ) : (
        <>
          <MissesSortControl />
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
                  href={`/mlb/games/${item.gameDate}/${item.homeCode}-vs-${item.awayCode}`}
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
                        예측 <strong>{predName}</strong> ({confPct}%) → 실제{" "}
                        <strong>{actualName}</strong> 승리
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-300 shrink-0">
                      고확신 실패
                    </span>
                  </div>

                  {item.topSupportingFactors.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                        예측을 뒷받침했던 팩터
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

                  <p className="text-xs text-brand-500 pt-1">→ 경기 상세 보기</p>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <footer className="border-t border-gray-200 dark:border-[var(--color-border)] pt-4">
        <ShareButtons
          url={PAGE_URL}
          title={`MLB 회고: 크게 빗나간 예측 Top ${MISS_REPORT_LIMIT}`}
          text="MoneyBall Score MLB 모델이 고확신으로 틀렸던 예측들의 팩터 분석"
        />
      </footer>
    </article>
  );
}
