import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { loadLatestCohort } from "@/lib/v2-shadow-monitor/loader";
import {
  KBO_FACTOR_COUNT,
  V2_PROMOTION_COHORT_N,
  SITE_URL,
  CURRENT_SCORING_RULE,
} from "@moneyball/shared";

const PAGE_URL = `${SITE_URL}/v2-shadow-monitor`;

export const metadata: Metadata = {
  title: "v2 섀도우 모니터",
  description:
    `${CURRENT_SCORING_RULE} (prod) 와 v2.0-shadow / v2.1-B-shadow / v1.5 / v1.6 / v1.7-revert era 별 적중률과 Brier 점수를 모두 공개. n=${V2_PROMOTION_COHORT_N} 임계 달성 — v2.1-B rejected (Brier 0.4635), v1.8 유지 확정 — 모델 진화 트랜스페어런시 dashboard.`,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "v2 섀도우 모니터 | MoneyBall Score",
    description:
      "era 별 적중률·Brier·요일별 cohort. 모델 진화 narrative 공개.",
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "v2 섀도우 모니터 | MoneyBall Score",
    description: "era 별 적중률·Brier·요일별 cohort 공개.",
  },
};

export const revalidate = 3600; // V2_SHADOW_MONITOR_ISR_SECONDS (Next.js 16 Turbopack: literal required)

function isPercentLikeColumn(label: string): boolean {
  return /acc|brier|%/i.test(label);
}

export default function V2ShadowMonitorPage() {
  const latest = loadLatestCohort();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": PAGE_URL,
    headline: "MoneyBall Score v2 섀도우 모니터",
    description:
      `${CURRENT_SCORING_RULE} (prod) 와 v2.0-shadow / v2.1-B-shadow / v1.5 / v1.6 / v1.7-revert era 별 적중률·Brier 점수 공개. n=${V2_PROMOTION_COHORT_N} 임계 달성 — v2.1-B rejected, v1.8 유지 확정.`,
    url: PAGE_URL,
    mainEntityOfPage: PAGE_URL,
    datePublished: "2026-06-01",
    dateModified: latest?.file.slice(0, 10) ?? "2026-06-01",
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
    inLanguage: "ko-KR",
    isPartOf: {
      "@type": "WebSite",
      name: "MoneyBall Score",
      url: SITE_URL,
    },
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <Breadcrumb items={[{ label: "v2 섀도우 모니터" }]} />

      <header className="space-y-4">
        <h1 className="text-3xl font-bold text-brand-900 dark:text-brand-100">
          v2 섀도우 모니터
        </h1>
        <p className="text-base text-brand-700 dark:text-brand-200 leading-relaxed">
          MoneyBall Score 의 모델 진화 과정을 모두 공개합니다. 현재 운용 중인
          {" "}{CURRENT_SCORING_RULE}{" "}가중치와 함께 v2.0-shadow · v2.1-B-shadow · v1.5 · v1.6 ·
          v1.7-revert era 별 적중률과 Brier 점수를 같은 cohort 위에서 비교하여,
          v1.8 유지 확정 결정의 근거를 투명하게 박제합니다.
        </p>
        <p className="text-sm text-brand-600 dark:text-brand-300 leading-relaxed">
          <strong className="text-brand-800 dark:text-brand-100">결정 임계</strong>{" "}
          = {CURRENT_SCORING_RULE} real cohort n={V2_PROMOTION_COHORT_N} — 실측 cohort 진척 및
          Brier drift 원인 분석은{" "}
          <Link
            href="/accuracy"
            className="text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-100 underline"
          >
            /accuracy
          </Link>
          {" "}live 참조. 임계 달성 완료 — v2.1-B rejected (Brier 0.4635), v1.8 유지 확정.
          본 dashboard 는 cohort 갱신 시점마다 자동 갱신됩니다.
        </p>
      </header>

      {!latest && (
        <section className="rounded-md border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900 px-4 py-6 text-sm text-brand-700 dark:text-brand-200">
          최신 cohort 데이터를 찾을 수 없습니다. 다음 op-analysis 갱신 시
          반영됩니다.
        </section>
      )}

      {latest && (
        <section className="space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-brand-200 dark:border-brand-800 pb-3">
            <h2 className="text-xl font-semibold text-brand-900 dark:text-brand-100">
              {latest.doc.title || "최신 cohort"}
            </h2>
            <p className="text-xs text-brand-500 dark:text-brand-400 font-mono">
              source: {latest.file}
            </p>
          </div>

          {latest.doc.summary && (
            <p className="text-sm text-brand-800 dark:text-brand-200">
              {latest.doc.summary}
            </p>
          )}

          {latest.doc.tables.map((table) => (
            <article
              key={table.heading}
              className="space-y-3"
              aria-labelledby={`section-${table.heading.replace(/\s+/g, "-")}`}
            >
              <h3
                id={`section-${table.heading.replace(/\s+/g, "-")}`}
                className="text-base font-semibold text-brand-900 dark:text-brand-100"
              >
                {table.heading}
              </h3>
              <div className="overflow-x-auto rounded-md border border-brand-200 dark:border-brand-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-brand-50 dark:bg-brand-900 text-brand-700 dark:text-brand-200">
                    <tr>
                      {table.columns.map((col) => (
                        <th
                          key={col}
                          scope="col"
                          className={`px-3 py-2 font-semibold text-left ${
                            isPercentLikeColumn(col) ? "text-right" : ""
                          }`}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-200 dark:divide-brand-800 text-brand-800 dark:text-brand-200">
                    {table.rows.map((row, i) => (
                      <tr
                        key={i}
                        className="odd:bg-white even:bg-brand-50/50 dark:odd:bg-brand-950 dark:even:bg-brand-900/40"
                      >
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className={`px-3 py-2 ${
                              isPercentLikeColumn(table.columns[j] ?? "")
                                ? "text-right font-mono"
                                : ""
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}

          {latest.doc.footer && (
            <p className="text-xs text-brand-500 dark:text-brand-400 border-t border-brand-200 dark:border-brand-800 pt-3">
              {latest.doc.footer}
            </p>
          )}
        </section>
      )}

      <section className="rounded-md border border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-900/40 px-4 py-5 space-y-3 text-sm text-brand-800 dark:text-brand-200">
        <h2 className="text-base font-semibold text-brand-900 dark:text-brand-100">
          더 자세히 알아보기
        </h2>
        <ul className="space-y-1.5 list-disc pl-5 marker:text-brand-400">
          <li>
            <Link
              href="/methodology"
              className="text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-100 underline"
            >
              예측 방법론
            </Link>{" "}
            — {KBO_FACTOR_COUNT}팩터 가중치 구조와 era 정의
          </li>
          <li>
            <Link
              href="/v2-preview"
              className="text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-100 underline"
            >
              v2 시뮬레이션 미리보기
            </Link>{" "}
            — v2.1-B 가중치 재적용 결과 (개별 경기 단위)
          </li>
          <li>
            <Link
              href="/changelog"
              className="text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-100 underline"
            >
              변경 로그
            </Link>{" "}
            — 가중치 튜닝과 모델 진화 이력
          </li>
          <li>
            <Link
              href="/dashboard"
              className="text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-100 underline"
            >
              모델 성능
            </Link>{" "}
            — 종합 적중률·Brier 추이
          </li>
        </ul>
      </section>
    </main>
  );
}
