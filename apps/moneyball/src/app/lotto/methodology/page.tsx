import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TableOfContents } from "@/components/shared/TableOfContents";
import { LottoDataSchema, type LottoData } from "@/lib/lotto/lotto-data-schema";
import { listArchiveDates } from "@/lib/lotto/archive";
import lottoDataRaw from "../../../../data/lotto-data.json";

export const dynamic = "force-static";
export const revalidate = 86400;

const SITE_URL = "https://moneyballscore.vercel.app";
const PAGE_URL = `${SITE_URL}/lotto/methodology`;

const TOC_ITEMS = [
  { id: "bridge", label: "분석 정체성" },
  { id: "method", label: "방법론 개요" },
  { id: "rules", label: "규칙 누적 진화" },
  { id: "oos", label: "OOS 검증" },
  { id: "fire", label: "사이클 진행 history" },
  { id: "use", label: "본인 사용 기록" },
];

export const metadata: Metadata = {
  title: "Lotto 통계 방법론",
  description:
    "MoneyBall Score KBO 분석 방법론을 응용한 6/45 패턴 통계 검증. 256+ rules saturation, Brier-like OOS 측정, 사이클 단위 진화 history. 본 페이지는 통계/분석 자료이며 당첨/베팅/예측을 제공하지 않습니다.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Lotto 통계 방법론 | MoneyBall Score",
    description:
      "KBO 세이버메트릭스 방법론을 패턴 통계 검증에 응용. 256+ rules, OOS 측정, 사이클 진화 history.",
    url: PAGE_URL,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lotto 통계 방법론 | MoneyBall Score",
    description: "256+ rules, OOS 검증, 사이클 단위 진화 history.",
  },
};

const lottoData: LottoData = LottoDataSchema.parse(lottoDataRaw);

function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

function buildSparkline(history: LottoData["rules_history"]): string {
  if (history.length === 0) return "";
  const counts = history.map((h) => h.count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const range = max - min || 1;
  const width = 240;
  const height = 48;
  const step = history.length > 1 ? width / (history.length - 1) : 0;
  const points = history
    .map((h, i) => {
      const x = i * step;
      const y = height - ((h.count - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return points;
}

export default function LottoMethodologyPage() {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Lotto 통계 방법론",
    description:
      "KBO 세이버메트릭스 분석 방법론을 응용한 6/45 패턴 통계 검증 — rules saturation, OOS 측정, 사이클 진화 history.",
    url: PAGE_URL,
    mainEntityOfPage: PAGE_URL,
    datePublished: "2026-05-21",
    dateModified: lottoData.generated_at,
    author: { "@type": "Organization", name: "MoneyBall Score" },
    publisher: {
      "@type": "Organization",
      name: "MoneyBall Score",
      url: SITE_URL,
    },
    inLanguage: "ko-KR",
  };

  const successCount = lottoData.chain_fire_history.filter(
    (c) => c.outcome === "success",
  ).length;
  const totalFires = lottoData.chain_fire_history.length;
  const ratio = ((lottoData.count_valid / lottoData.total_combinations) * 100).toFixed(2);
  const oosLatest = lottoData.oos_pass_rate[lottoData.oos_pass_rate.length - 1];
  const sparkPoints = buildSparkline(lottoData.rules_history);
  const latestArchiveDate = listArchiveDates()[0] ?? null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <Breadcrumb
        items={[
          { label: "홈", href: "/" },
          { label: "Lotto 통계 방법론" },
        ]}
      />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-brand-100">Lotto 통계 방법론</h1>
        <p className="text-sm text-brand-300 max-w-2xl">
          KBO 분석 방법론을 6/45 패턴 통계 검증에 응용한 자료. 본 페이지는
          통계/분석 자료이며 당첨/베팅/조합 추천을 제공하지 않습니다.
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-brand-400">
          <span className="rounded bg-brand-900 border border-brand-800 px-2 py-1">
            누적 규칙 {formatNumber(lottoData.rules_total)}
          </span>
          <span className="rounded bg-brand-900 border border-brand-800 px-2 py-1">
            유효 조합 {formatNumber(lottoData.count_valid)} / {formatNumber(lottoData.total_combinations)} ({ratio}%)
          </span>
          <span className="rounded bg-brand-900 border border-brand-800 px-2 py-1">
            사이클 진행 {successCount}/{totalFires} success
          </span>
        </div>
      </header>

      <TableOfContents items={TOC_ITEMS} />

      <section id="bridge" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-semibold text-brand-100">분석 정체성</h2>
        <p className="text-sm text-brand-200 leading-relaxed">
          KBO 분석 방법론을 로또 패턴 검증에 응용. MoneyBall Score 본체는
          세이버메트릭스 10팩터 모델 + AI 에이전트 토론 + 적중률 검증으로
          야구 경기 결과를 통계적으로 분석합니다. 본 페이지는 같은 사고
          방식 — 누적 데이터 + 검증 가능한 규칙 + 사이클 단위 진화 — 을
          6/45 추첨 데이터에 적용한 결과를 정리한 자료입니다.
        </p>
        <p className="text-sm text-brand-300 leading-relaxed">
          본 자료는 통계적 사고 훈련 + 패턴 검증의 한계를 직접 측정한
          기록입니다. 미래 추첨 결과 예측 또는 베팅 조언을 제공하지 않습니다.
        </p>
      </section>

      <section id="method" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-semibold text-brand-100">방법론 개요</h2>
        <ol className="space-y-2 text-sm text-brand-200 list-decimal pl-5">
          <li>
            <strong className="text-brand-100">규칙 누적 검증</strong> — 6/45
            조합 공간 (총 8,145,060 가지) 에 256+ rules 를 누적 적용. 각
            규칙은 과거 회차 검증 결과 PASS 시 보존, FAIL 시 수정 또는 제거.
          </li>
          <li>
            <strong className="text-brand-100">OOS (Out-of-Sample) 측정</strong>{" "}
            — 규칙 정의 시점 이후 새 회차 데이터로 검증. 본인 사용 N=1
            anecdote 한계 명시 (sample floor preliminary N=5 / actionable N=10).
          </li>
          <li>
            <strong className="text-brand-100">사이클 단위 진화</strong> —
            매 추첨 직후 신규 규칙 후보 검증 + 기존 256 rule validation +
            countValid delta 측정.
          </li>
        </ol>
      </section>

      <section id="rules" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-semibold text-brand-100">규칙 누적 진화</h2>
        <p className="text-sm text-brand-300 leading-relaxed">
          누적 {formatNumber(lottoData.rules_total)} 규칙 / 유효 조합 {formatNumber(lottoData.count_valid)} ({ratio}%).
          rules history (사이클별 누적 수):
        </p>
        {sparkPoints && lottoData.rules_history.length > 1 ? (
          <div className="bg-brand-900 border border-brand-800 rounded p-3">
            <svg viewBox="0 0 240 48" className="w-full h-12">
              <polyline
                points={sparkPoints}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-brand-400"
              />
            </svg>
          </div>
        ) : (
          <p className="text-xs text-brand-400">
            sparkline 표시 점 부족 — rules_history 누적 시 자동 활성화.
          </p>
        )}
        <ul className="text-xs text-brand-400 space-y-1">
          {lottoData.rules_history.map((h) => (
            <li key={h.cycle}>
              cycle {h.cycle} — 누적 {h.count} (delta {h.delta >= 0 ? "+" : ""}
              {h.delta})
            </li>
          ))}
        </ul>
      </section>

      <section id="oos" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-semibold text-brand-100">OOS 검증</h2>
        <p className="text-sm text-brand-300 leading-relaxed">
          규칙 정의 시점 이후 새 회차 검증 결과. {lottoData.oos_pass_rate.length} 건 누적.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-brand-900 border-b border-brand-800 text-brand-300 text-xs uppercase">
                <th className="text-left px-3 py-2 font-semibold">회차</th>
                <th className="text-left px-3 py-2 font-semibold">날짜</th>
                <th className="text-right px-3 py-2 font-semibold">PASS</th>
                <th className="text-right px-3 py-2 font-semibold">FAIL</th>
              </tr>
            </thead>
            <tbody>
              {lottoData.oos_pass_rate.map((r) => (
                <tr key={r.draw} className="border-b border-brand-800/50">
                  <td className="px-3 py-2 text-brand-200">{r.draw}</td>
                  <td className="px-3 py-2 text-brand-300">{r.date}</td>
                  <td className="px-3 py-2 text-right text-brand-100">{r.passed}</td>
                  <td className="px-3 py-2 text-right text-brand-400">{r.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {oosLatest && (
          <p className="text-xs text-brand-400">
            최근 회차 ({oosLatest.draw} / {oosLatest.date}) PASS {oosLatest.passed} / FAIL {oosLatest.failed}.
            N&lt;10 sample preliminary — 단일 회차 PASS 로 검증 단정 차단.
          </p>
        )}
      </section>

      <section id="fire" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-semibold text-brand-100">사이클 진행 history</h2>
        <p className="text-sm text-brand-300 leading-relaxed">
          develop-cycle skill 안 lotto chain fire 누적. 본 사이트 운영
          시스템이 매 사이클 본 규칙 검증을 실행한 운영 기록입니다.
        </p>
        <details className="bg-brand-900 border border-brand-800 rounded">
          <summary className="cursor-pointer px-3 py-2 text-sm text-brand-200">
            누적 {totalFires} 진행 ({successCount} success)
          </summary>
          <ul className="text-xs text-brand-400 px-4 py-2 max-h-48 overflow-y-auto space-y-0.5">
            {lottoData.chain_fire_history.map((c) => (
              <li key={`${c.cycle}-${c.date}`}>
                cycle {c.cycle} — {c.outcome} ({c.date})
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section id="use" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-semibold text-brand-100">본인 사용 기록</h2>
        <p className="text-sm text-brand-300 leading-relaxed">
          본인이 직접 사용한 50조합 기록 archive 는 별도 페이지에
          비공개로 보관됩니다. 통계 분석 자료 정체성 보존 + 검색 색인
          차단 (noindex).
        </p>
        {latestArchiveDate ? (
          <p className="text-xs text-brand-400">
            <Link
              href={`/lotto/archive/${latestArchiveDate}`}
              rel="nofollow"
              className="text-brand-300 underline hover:text-brand-100"
            >
              최근 archive 보기 ({latestArchiveDate}) →
            </Link>
          </p>
        ) : null}
        <p className="text-xs text-brand-400">
          본 자료는 통계/분석 학습 자료이며, 실제 행동/베팅/구매 권유를
          포함하지 않습니다.
        </p>
      </section>

      <footer className="border-t border-brand-800 pt-6 text-xs text-brand-400 flex flex-wrap gap-3">
        <Link href="/methodology" className="hover:text-brand-200">
          ← KBO 예측 방법론
        </Link>
        <Link href="/guide" className="hover:text-brand-200">
          사용 가이드 →
        </Link>
        <Link href="/changelog" className="hover:text-brand-200">
          변경 로그 →
        </Link>
      </footer>
    </main>
  );
}
