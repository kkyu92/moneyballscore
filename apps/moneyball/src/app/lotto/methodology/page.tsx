import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TableOfContents } from "@/components/shared/TableOfContents";
import { KBO_FACTOR_COUNT, LOTTO_PICK_COUNT, SITE_URL } from "@moneyball/shared";
import {
  LottoDataSchema,
  LottoScoreBacktestSchema,
  type LottoData,
  type LottoScoreBacktest,
} from "@/lib/lotto/lotto-data-schema";
import { listArchiveDates } from "@/lib/lotto/archive";
import lottoDataRaw from "../../../../data/lotto-data.json";
import lottoScoreBacktestRaw from "../../../../data/lotto-score-backtest.json";

export const dynamic = "force-static";
export const revalidate = 86400; // LOTTO_ARCHIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

const PAGE_URL = `${SITE_URL}/lotto/methodology`;

const TOC_ITEMS = [
  { id: "bridge", label: "분석 정체성" },
  { id: "method", label: "방법론 개요" },
  { id: "rules", label: "규칙 누적 진화" },
  { id: "oos", label: "OOS 검증" },
  { id: "score-distribution", label: "score 분포 backtest" },
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
const scoreBacktest: LottoScoreBacktest = LottoScoreBacktestSchema.parse(
  lottoScoreBacktestRaw,
);

type PercentileMarker = {
  key: keyof LottoScoreBacktest["score_percentiles"];
  label: string;
};

const PERCENTILE_MARKERS: PercentileMarker[] = [
  { key: "p0", label: "top 0%" },
  { key: "p5", label: "top 5%" },
  { key: "p25", label: "top 25%" },
  { key: "p50", label: "median" },
  { key: "p75", label: "top 75%" },
  { key: "p95", label: "top 95%" },
  { key: "p100", label: "top 100%" },
];

function buildScoreDistribution(backtest: LottoScoreBacktest) {
  const { min, max } = backtest.score_stats;
  const range = max - min || 1;
  const width = 320;
  const height = 56;
  const padX = 12;
  const innerW = width - padX * 2;
  const baseY = height - 20;
  const positionFor = (value: number) =>
    padX + ((value - min) / range) * innerW;
  return {
    width,
    height,
    padX,
    baseY,
    positionFor,
    markers: PERCENTILE_MARKERS.map((m) => ({
      ...m,
      value: backtest.score_percentiles[m.key],
    })),
  };
}

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
  const dist = buildScoreDistribution(scoreBacktest);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <Breadcrumb
        items={[
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
          세이버메트릭스 {KBO_FACTOR_COUNT}팩터 모델 + AI 에이전트 토론 + 적중률 검증으로
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
                <th className="text-right px-3 py-2 font-semibold">5등 매칭</th>
                <th className="text-right px-3 py-2 font-semibold">평균 매칭</th>
                <th className="text-right px-3 py-2 font-semibold">over-perform</th>
              </tr>
            </thead>
            <tbody>
              {lottoData.oos_pass_rate.map((r) => {
                const md = r.match_distribution;
                return (
                  <tr key={r.draw} className="border-b border-brand-800/50">
                    <td className="px-3 py-2 text-brand-200">{r.draw}</td>
                    <td className="px-3 py-2 text-brand-300">{r.date}</td>
                    <td className="px-3 py-2 text-right text-brand-100">{r.passed}</td>
                    <td className="px-3 py-2 text-right text-brand-400">{r.failed}</td>
                    <td className="px-3 py-2 text-right text-brand-200">
                      {md ? `${md.tier_3}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-brand-300">
                      {md ? md.avg_match.toFixed(2) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-brand-200">
                      {md ? `${md.over_perform_ratio.toFixed(2)}×` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {oosLatest?.match_distribution && (
          <div className="bg-brand-900 border border-brand-800 rounded p-3 text-xs text-brand-300 space-y-2">
            <p className="text-brand-200 font-semibold">
              직전 회차 ({oosLatest.draw}) {LOTTO_PICK_COUNT}세트 매칭 분포
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              <li>5등 (3개): {oosLatest.match_distribution.tier_3}건</li>
              <li>4등 (4개): {oosLatest.match_distribution.tier_4}건</li>
              <li>3등 (5개): {oosLatest.match_distribution.tier_5}건</li>
              <li>2등 (5+B): {oosLatest.match_distribution.tier_5_bonus}건</li>
              <li>1등 (6개): {oosLatest.match_distribution.tier_6}건</li>
              <li>평균 매칭: {oosLatest.match_distribution.avg_match.toFixed(2)}</li>
            </ul>
            <p>
              random benchmark 5등 expected ={" "}
              {oosLatest.match_distribution.random_expected_tier_3.toFixed(2)}건 → 실제{" "}
              {oosLatest.match_distribution.tier_3}건 ={" "}
              <strong className="text-brand-200">
                {oosLatest.match_distribution.over_perform_ratio.toFixed(2)}× over-perform
              </strong>
              .
            </p>
            {oosLatest.winning_score_breakdown && (
              <p>
                1등 조합 unpopularityScore ={" "}
                <strong className="text-brand-200">
                  {oosLatest.winning_score_breakdown.total.toFixed(2)}
                </strong>{" "}
                (sum 거리 +{oosLatest.winning_score_breakdown.sum_distance.toFixed(2)} / 연속쌍 +
                {oosLatest.winning_score_breakdown.consec_pairs_bonus.toFixed(2)} / LUCKY{" "}
                {oosLatest.winning_score_breakdown.lucky_penalty.toFixed(2)})
                {oosLatest.winning_score_breakdown.pool_rank_pct !== undefined && (
                  <>
                    . valid pool 안 추정 top{" "}
                    {oosLatest.winning_score_breakdown.pool_rank_pct.toFixed(2)}% — {LOTTO_PICK_COUNT}세트 cutoff
                    (top ~0.65%) 미달 = score 모델 약점 candidate.
                  </>
                )}
              </p>
            )}
          </div>
        )}
        {oosLatest && (
          <p className="text-xs text-brand-400">
            최근 회차 ({oosLatest.draw} / {oosLatest.date}) PASS {oosLatest.passed} / FAIL {oosLatest.failed}.
            N&lt;10 sample preliminary — 단일 회차 PASS 로 검증 단정 차단.
          </p>
        )}
      </section>

      <section id="score-distribution" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-semibold text-brand-100">
          score 분포 backtest
        </h2>
        <p className="text-sm text-brand-300 leading-relaxed">
          N={formatNumber(scoreBacktest.n_rounds)} 회차 1등 조합 unpopularityScore
          분포. {LOTTO_PICK_COUNT}세트 추천 모델 cutoff (valid pool 안 top 0.65%) 와 비교 시
          historical 1등 조합 평균이 어느 percentile band 에 분포하는지 확인.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-brand-900 border border-brand-800 rounded p-2 space-y-1">
            <div className="text-brand-400">표본 수 N</div>
            <div className="text-brand-100 font-semibold">
              {formatNumber(scoreBacktest.score_stats.n)}
            </div>
          </div>
          <div className="bg-brand-900 border border-brand-800 rounded p-2 space-y-1">
            <div className="text-brand-400">평균</div>
            <div className="text-brand-100 font-semibold">
              {scoreBacktest.score_stats.mean.toFixed(2)}
            </div>
          </div>
          <div className="bg-brand-900 border border-brand-800 rounded p-2 space-y-1">
            <div className="text-brand-400">중앙값</div>
            <div className="text-brand-100 font-semibold">
              {scoreBacktest.score_stats.median.toFixed(2)}
            </div>
          </div>
          <div className="bg-brand-900 border border-brand-800 rounded p-2 space-y-1">
            <div className="text-brand-400">범위</div>
            <div className="text-brand-100 font-semibold">
              {scoreBacktest.score_stats.min.toFixed(1)} ~{" "}
              {scoreBacktest.score_stats.max.toFixed(1)}
            </div>
          </div>
        </div>
        <div className="bg-brand-900 border border-brand-800 rounded p-3">
          <svg
            viewBox={`0 0 ${dist.width} ${dist.height}`}
            className="w-full h-14"
            role="img"
            aria-label="historical 1등 조합 unpopularityScore percentile 분포"
          >
            <line
              x1={dist.padX}
              y1={dist.baseY}
              x2={dist.width - dist.padX}
              y2={dist.baseY}
              stroke="currentColor"
              strokeWidth="1"
              className="text-brand-700"
            />
            {dist.markers.map((m) => {
              const x = dist.positionFor(m.value);
              const isMedian = m.key === "p50";
              return (
                <g key={m.key}>
                  <line
                    x1={x}
                    y1={dist.baseY - (isMedian ? 18 : 12)}
                    x2={x}
                    y2={dist.baseY + (isMedian ? 8 : 4)}
                    stroke="currentColor"
                    strokeWidth={isMedian ? "1.8" : "1"}
                    className={isMedian ? "text-brand-200" : "text-brand-400"}
                  />
                  <text
                    x={x}
                    y={dist.baseY - (isMedian ? 22 : 16)}
                    fontSize="8"
                    textAnchor="middle"
                    fill="currentColor"
                    className={isMedian ? "text-brand-200" : "text-brand-500"}
                  >
                    {m.value.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="mt-2 grid grid-cols-3 sm:grid-cols-7 gap-1 text-[10px] text-brand-500">
            {dist.markers.map((m) => (
              <div key={`${m.key}-label`} className="text-center">
                {m.label}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-brand-400 leading-relaxed">{scoreBacktest.note}</p>
        <ul className="text-xs text-brand-500 list-disc pl-5 space-y-1">
          {scoreBacktest.limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section id="fire" className="scroll-mt-20 space-y-3">
        <h2 className="text-xl font-semibold text-brand-100">사이클 진행 history</h2>
        <p className="text-sm text-brand-300 leading-relaxed">
          develop-cycle skill 안 lotto chain fire 누적. 본 사이트 운영
          시스템이 매 사이클 본 규칙 검증을 실행한 운영 기록입니다.
        </p>
        <div className="bg-brand-900 border border-brand-800 rounded p-3 text-xs text-brand-300 space-y-2">
          <p className="text-brand-200 font-semibold">규칙 정합 evidence</p>
          <p>
            본 chain trigger 조건 (chain pool table) = 신규 회차 추첨 D-7 안 picks
            부재 / 추첨 직후 OOS 박제 부재 / 30+ 사이클 미발화 gap / 사용자 자연
            발화 등. 매 fire 의 outcome 과 다음 추천 chain 은 본 운영 spec
            정합으로 자가 검증됩니다.
          </p>
        </div>
        <details className="bg-brand-900 border border-brand-800 rounded">
          <summary className="cursor-pointer px-3 py-2 text-sm text-brand-200">
            누적 {totalFires} 진행 ({successCount} success)
          </summary>
          <ul className="text-xs text-brand-400 px-4 py-2 max-h-64 overflow-y-auto space-y-1">
            {lottoData.chain_fire_history.map((c) => (
              <li key={`${c.cycle}-${c.date}`} className="flex flex-wrap gap-x-2">
                <span className="text-brand-300">cycle {c.cycle}</span>
                <span>—</span>
                <span
                  className={
                    c.outcome === "success"
                      ? "text-brand-200"
                      : c.outcome === "partial"
                        ? "text-amber-400"
                        : "text-red-400"
                  }
                >
                  {c.outcome}
                </span>
                <span className="text-brand-500">({c.date})</span>
                {c.next_recommended ? (
                  <span className="text-brand-500">
                    → next: {c.next_recommended}
                  </span>
                ) : null}
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
