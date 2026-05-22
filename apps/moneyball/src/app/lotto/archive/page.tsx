import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { listArchiveDates } from "@/lib/lotto/archive";

export const dynamic = "force-static";
export const revalidate = 86400;

const SITE_URL = "https://moneyballscore.vercel.app";
const PAGE_URL = `${SITE_URL}/lotto/archive`;

export const metadata: Metadata = {
  title: "Lotto 통계 아카이브",
  description:
    "토요일 추첨일별 50조합 통계 분석 아카이브. 256개 회피 규칙을 통과한 조합 기록. 통계 학습 자료 — 행동/베팅/구매 권유 X.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Lotto 통계 아카이브 | MoneyBall Score",
    description:
      "토요일 추첨일별 50조합 통계 분석 아카이브. 256개 회피 규칙 통과 조합 기록.",
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lotto 통계 아카이브 | MoneyBall Score",
    description: "회차별 50조합 통계 분석 기록.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function LottoArchiveIndexPage() {
  const dates = listArchiveDates();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    headline: "Lotto 통계 아카이브",
    description:
      "토요일 추첨일별 50조합 통계 분석 아카이브 — 256개 회피 규칙 통과 조합 기록.",
    url: PAGE_URL,
    mainEntityOfPage: PAGE_URL,
    inLanguage: "ko-KR",
    datePublished: "2026-05-22",
    dateModified: dates[0]
      ? `${dates[0]}T20:45:00+09:00`
      : "2026-05-22",
    author: { "@type": "Organization", name: "MoneyBall Score" },
    publisher: {
      "@type": "Organization",
      name: "MoneyBall Score",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon/512`,
      },
    },
    isPartOf: {
      "@type": "WebSite",
      name: "MoneyBall Score",
      url: SITE_URL,
    },
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <Breadcrumb
        items={[
          { href: "/lotto/methodology", label: "Lotto 통계" },
          { label: "아카이브" },
        ]}
      />

      <header className="space-y-2 border-b border-brand-800 pb-4">
        <p className="text-xs uppercase tracking-widest text-brand-400">
          통계 분석 · 회차별 기록
        </p>
        <h1 className="text-3xl font-semibold text-brand-100">
          Lotto 통계 아카이브
        </h1>
        <p className="text-sm text-brand-300">
          토요일 추첨일별 50조합 통계 분석 기록입니다. 256개 회피 규칙을 통과한
          조합만 박제됩니다. 당첨 확률 향상 X · 행동/베팅/구매 권유 X · 통계
          학습 자료.
        </p>
      </header>

      <section aria-label="회차별 archive list" className="space-y-4">
        <h2 className="text-sm font-semibold text-brand-300 uppercase tracking-wide">
          박제된 회차 ({dates.length}건)
        </h2>

        {dates.length === 0 ? (
          <div className="bg-brand-900/30 border border-dashed border-brand-800 rounded-lg p-8 text-center">
            <p className="text-sm text-brand-400">
              아직 박제된 회차가 없습니다.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dates.map((date) => (
              <li key={date}>
                <Link
                  href={`/lotto/archive/${date}`}
                  className="block bg-brand-900/40 border border-brand-800 hover:border-brand-500 rounded-lg p-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  <p className="text-xs text-brand-400 uppercase tracking-wide mb-1">
                    추첨일
                  </p>
                  <p className="text-lg font-semibold text-brand-100 font-mono tabular-nums">
                    {date}
                  </p>
                  <p className="text-xs text-brand-500 mt-2">
                    50조합 통계 분석 →
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t border-brand-800 pt-6 text-sm space-y-3">
        <p className="text-xs text-brand-400">관련 자료</p>
        <nav aria-label="관련 자료" className="flex flex-wrap gap-3">
          <Link
            href="/lotto/methodology"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-900/40 border border-brand-800 hover:border-brand-500 rounded-full text-sm text-brand-200 hover:text-brand-100 transition-colors"
          >
            ← Lotto 통계 방법론
          </Link>
          <Link
            href="/methodology"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-900/40 border border-brand-800 hover:border-brand-500 rounded-full text-sm text-brand-200 hover:text-brand-100 transition-colors"
          >
            KBO 예측 방법론 →
          </Link>
        </nav>
      </footer>
    </main>
  );
}
