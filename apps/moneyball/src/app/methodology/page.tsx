import type { Metadata } from "next";
import Link from "next/link";
import {HOME_ADVANTAGE_PCT, HOME_WIN_RATE_PCT, HOME_WIN_RATE_SAMPLE_N, KBO_FACTOR_COUNT, CURRENT_SCORING_RULE, SITE_URL, V2_PROMOTION_COHORT_N, WINNER_PROB_LEAN, SUNDAY_CAP_CONFIDENCE, WINNER_PROB_CLAMP_MIN, WINNER_PROB_CLAMP_MAX, BRIER_BASELINE } from "@moneyball/shared";
import {
  MetricRegistry,
  FANGRAPHS_AUX_METRICS,
  type MetricSlug,
} from "@moneyball/kbo-data";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TableOfContents } from "@/components/shared/TableOfContents";
import { GLOSSARY_TERM_COUNT } from "../glossary/data";

const TOC_ITEMS = [
  { id: "principles", label: "핵심 원칙" },
  { id: "data-sources", label: "데이터 소스" },
  { id: "weights", label: `${KBO_FACTOR_COUNT}팩터 가중치` },
  { id: "agents", label: "AI 에이전트" },
  { id: "verification", label: "검증 방법" },
  { id: "history", label: "모델 진화" },
  { id: "limits", label: "한계 + 면책" },
];

export const metadata: Metadata = {
  title: "예측 방법론",
  description: `MoneyBall Score 가 KBO 승부예측을 만드는 전체 과정. 세이버메트릭스 ${KBO_FACTOR_COUNT}팩터 정량 모델 + AI 에이전트 토론 + 적중률 검증. 데이터 소스 3종, 가중치 도출 근거, 모델 진화 history 를 한 페이지에서 확인.`,
  alternates: { canonical: `${SITE_URL}/methodology` },
  openGraph: {
    title: "예측 방법론 | MoneyBall Score",
    description: `세이버메트릭스 ${KBO_FACTOR_COUNT}팩터 + AI 에이전트 토론 + 적중률 검증. 가중치 도출 근거와 모델 진화 history 전체 공개.`,
    url: `${SITE_URL}/methodology`,
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "예측 방법론 | MoneyBall Score",
    description: `세이버메트릭스 ${KBO_FACTOR_COUNT}팩터 + AI 에이전트 토론. 가중치 근거 + 모델 진화 history 전체 공개.`,
  },
};

const FACTOR_WEIGHTS: Array<{ slug: MetricSlug; rationale: string }> = [
  {
    slug: "sp_fip",
    rationale:
      "선발이 게임 전체 흐름의 절반 이상을 만든다. FIP 는 운/수비 영향을 제거한 투수 본인 실력이라 다음 등판 예측에 ERA 보다 정확.",
  },
  {
    slug: "sp_xfip",
    rationale:
      "FIP 의 홈런 변동성을 정규화한 보조 지표. 시즌 후반으로 갈수록 신뢰도가 ↑.",
  },
  {
    slug: "lineup_woba",
    rationale:
      "단타·2루타·홈런·볼넷 각각에 가중치를 둔 종합 타격 생산성. 타율보다 득점 기여도와 강한 상관.",
  },
  {
    slug: "bullpen_fip",
    rationale:
      "선발 강판 후 경기 결과를 좌우. 불펜 평균자책점 (RA) 은 수비 운에 흔들리니 FIP 사용.",
  },
  {
    slug: "elo",
    rationale:
      "체스에서 유래한 상대적 전력. 강팀을 이기면 많이 오르고 약팀에 지면 많이 내려간다. KBO Fancy Stats Elo 와 비교하여 우리 모델 성능을 검증.",
  },
  {
    slug: "recent_form",
    rationale:
      "시즌 전체 성적보다 현재 팀 컨디션을 반영. 부상자 복귀·trade 후 변화도 빠르게 잡힌다.",
  },
  {
    slug: "war",
    rationale:
      "Wins Above Replacement. 대체 선수 대비 팀 승리 기여도 총합. 시즌 전체 누적 전력 척도.",
  },
  {
    slug: "sfr",
    rationale:
      "Skill-based Fielding Runs. 수비 능력을 점수로 환산. 운/구장 효과 분리.",
  },
  {
    slug: "park_factor",
    rationale:
      "잠실 (투수 친화) ↔ 사직 (타자 친화) 같은 구장별 득점 환경 차이를 보정.",
  },
  {
    slug: "head_to_head",
    rationale:
      "두 팀 시즌 내 맞대결 기록. 분석에서 가장 작은 가중치 — 표본이 작아 노이즈가 크다는 사실을 누적 데이터로 확인.",
  },
];

const totalWeight = FACTOR_WEIGHTS.reduce(
  (sum, f) => sum + MetricRegistry[f.slug].weight_v18,
  0,
);

const VERSION_HISTORY = [
  {
    version: "v1.0",
    date: "2026-04 (초기)",
    change: "10 팩터 + 균등 가중 baseline. KBO 첫 시즌 적용.",
  },
  {
    version: "v1.5",
    date: "2026-04",
    change: "AI 에이전트 토론 통합 (홈/원정/심판 3-agent). Brier 0.255 → 0.243.",
  },
  {
    version: "v1.6",
    date: "2026-04 ~ 05",
    change: "park_factor 4% + sfr 5% 도입. 노이즈 영역 식별.",
  },
  {
    version: "v1.7-revert",
    date: "2026-05",
    change: "park_factor 가중치 일시 강화 후 적중률 ↓ 측정 → 원복 결정. 데이터 기반 의사결정 evidence.",
  },
  {
    version: "v1.8",
    date: "2026-05-12 ~ 현재",
    change:
      `head_to_head 5% → 3% (표본 부족 노이즈 인정) + elo 8% → 10% (정보가치 Δ +0.30 최강). Sunday cap 도입 — 일요일 ${WINNER_PROB_LEAN} 초과 시 ${SUNDAY_CAP_CONFIDENCE} 강등.`,
  },
  {
    version: "v2.0 (임계 도달, 결정 대기)",
    date: `n=${V2_PROMOTION_COHORT_N} crossed — /accuracy 참조`,
    change:
      `임계 n=${V2_PROMOTION_COHORT_N} 달성 완료 — 전면 가중치 재조정 결정 대기 중. 실시간 cohort 진척은 /accuracy 페이지 참조.`,
  },
];

// MetricRegistry source filter 단일 source-of-truth — silent drift family wave 68 (cycle 1268).
// hardcoded "FIP · xFIP · WAR · wOBA · SFR · Elo" (bullpen_fip 누락) → MetricRegistry dynamic.
const FANCYSTATS_PRODUCTION_METRICS = Object.values(MetricRegistry)
  .filter((m) => m.source === "fancystats" && m.weight_v18 > 0)
  .map((m) => m.ko_name);
const FANCYSTATS_METRIC_LABEL = FANCYSTATS_PRODUCTION_METRICS.join(" · ");
const FANCYSTATS_METRIC_COUNT = FANCYSTATS_PRODUCTION_METRICS.length;
const PRODUCTION_METRIC_COUNT = Object.values(MetricRegistry).filter(
  (m) => m.weight_v18 > 0,
).length;

// FanGraphs 보조 metric 라벨 — silent drift family wave 69 (cycle 1269).
// hardcoded "wRC+ · ISO · BB%/K%" methodology + about 다중 drift → 단일 constant.
const FANGRAPHS_METRIC_LABEL = `${FANGRAPHS_AUX_METRICS.join(" · ")} (보조)`;

const JSONLD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "MoneyBall Score 예측 방법론",
  description: `세이버메트릭스 ${KBO_FACTOR_COUNT}팩터 정량 모델 + AI 에이전트 토론 + 적중률 검증 방법론 전체 공개.`,
  url: `${SITE_URL}/methodology`,
  publisher: {
    "@type": "Organization",
    name: "MoneyBall Score",
    url: SITE_URL,
  },
  inLanguage: "ko-KR",
};

export default function MethodologyPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
      />

      <Breadcrumb
        items={[
          { label: "소개", href: "/about" },
          { label: "예측 방법론" },
        ]}
      />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold">예측 방법론</h1>
        <p className="text-base text-gray-600 dark:text-brand-300 leading-relaxed">
          MoneyBall Score 의 KBO 승부예측은 직관이나 감으로 만들지 않습니다. 세
          가지 데이터 소스에서 매일 자동 수집한 세이버메트릭스 지표 {KBO_FACTOR_COUNT}개를
          가중합산한 뒤, AI 에이전트 3개가 토론하여 최종 승률을 결정합니다.
          매 경기 종료 후 실제 결과와 비교하여 적중률을 측정하고, 정해진 검증
          표본이 쌓이면 가중치를 재조정합니다. 이 페이지는 그 전체 과정을
          숨김없이 공개합니다.
        </p>
      </header>

      <TableOfContents items={TOC_ITEMS} />

      <section id="principles" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold border-b border-gray-200 dark:border-brand-700 pb-2">
          1. 핵심 원칙 3가지
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <h3 className="font-semibold mb-2">① 정량 우선</h3>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
              &quot;어느 팀 분위기 좋다&quot; 같은 직관 평가 X. 모든 예측은 측정 가능한
              세이버메트릭스 지표로 환산됩니다.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <h3 className="font-semibold mb-2">② AI 토론 검증</h3>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
              정량 모델이 낸 1차 결과를 홈/원정 옹호 에이전트가 각자 변호하고,
              심판 에이전트가 양측 주장을 비교하여 보정.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <h3 className="font-semibold mb-2">③ 실측 검증</h3>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
              매 경기 종료 후 적중률을 누적. 표본이 충분히 쌓이면 통계적으로
              유의미한 항목만 가중치 조정에 반영.
            </p>
          </div>
        </div>
      </section>

      <section id="data-sources" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold border-b border-gray-200 dark:border-brand-700 pb-2">
          2. 데이터 소스 3종
        </h2>
        <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
          하나의 소스에 의존하지 않습니다. 같은 지표를 여러 출처에서 교차
          확인하여 데이터 오류를 차단합니다.
        </p>
        <ul className="space-y-3">
          <li className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <div className="flex items-baseline justify-between mb-2 gap-2 flex-wrap">
              <h3 className="font-semibold">
                KBO 공식{" "}
                <span className="text-xs text-gray-500 dark:text-brand-400 font-normal">
                  (koreabaseball.com)
                </span>
              </h3>
              <span className="text-xs text-gray-500 dark:text-brand-400">
                경기 일정 · 결과 · 라이브 스코어
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
              경기 일정, 선발 투수 확정 시각, 최종 결과, 이닝별 점수를 공식
              사이트에서 수집. 가장 권위 있는 원천 데이터.
            </p>
          </li>
          <li className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <div className="flex items-baseline justify-between mb-2 gap-2 flex-wrap">
              <h3 className="font-semibold">
                KBO Fancy Stats{" "}
                <span className="text-xs text-gray-500 dark:text-brand-400 font-normal">
                  (kbofancystats.com)
                </span>
              </h3>
              <span className="text-xs text-gray-500 dark:text-brand-400">
                {FANCYSTATS_METRIC_LABEL}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
              세이버메트릭스 고급 지표의 주 원천. 분석 가중치{" "}
              {PRODUCTION_METRIC_COUNT}팩터 중 {FANCYSTATS_METRIC_COUNT}개를 이
              소스에서 가져온다.
            </p>
          </li>
          <li className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <div className="flex items-baseline justify-between mb-2 gap-2 flex-wrap">
              <h3 className="font-semibold">
                FanGraphs KBO{" "}
                <span className="text-xs text-gray-500 dark:text-brand-400 font-normal">
                  (fangraphs.com/leaders/international/kbo)
                </span>
              </h3>
              <span className="text-xs text-gray-500 dark:text-brand-400">
                {FANGRAPHS_METRIC_LABEL}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
              메이저리그 분석으로 유명한 FanGraphs 의 KBO 섹션. 보조 검증용.
              주 소스가 갱신 지연 시 대체 데이터로 활용.
            </p>
          </li>
        </ul>
        <p className="text-xs text-gray-500 dark:text-brand-400">
          ※ statiz.co.kr 은 robots.txt 가 전체 차단되어 사용 불가.
        </p>
      </section>

      <section id="weights" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold border-b border-gray-200 dark:border-brand-700 pb-2">
          3. {KBO_FACTOR_COUNT}팩터 가중합산 ({CURRENT_SCORING_RULE})
        </h2>
        <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
          각 팩터를 -1 ~ +1 범위로 정규화한 뒤 가중치를 곱해 합산합니다. 결과에
          홈팀 어드밴티지 +{HOME_ADVANTAGE_PCT.toFixed(1)}% 를 더하여 최종
          승률 0 ~ 1 을 산출. 가중치 합계 = {(totalWeight * 100).toFixed(0)}%.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-brand-700">
                <th className="text-left py-2 px-2">팩터</th>
                <th className="text-right py-2 px-2">가중치</th>
                <th className="text-left py-2 px-2 hidden md:table-cell">
                  도입 근거
                </th>
              </tr>
            </thead>
            <tbody>
              {FACTOR_WEIGHTS.map((f) => {
                const m = MetricRegistry[f.slug];
                return (
                  <tr
                    key={f.slug}
                    className="border-b border-gray-100 dark:border-brand-800 align-top"
                  >
                    <td className="py-2 px-2 font-medium">{m.ko_name}</td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      {(m.weight_v18 * 100).toFixed(0)}%
                    </td>
                    <td className="py-2 px-2 text-gray-600 dark:text-brand-300 leading-relaxed hidden md:table-cell">
                      {f.rationale}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 dark:text-brand-400">
          홈팀 어드밴티지 +{HOME_ADVANTAGE_PCT.toFixed(1)}% 는 2023 ~ 2026
          시즌 N={HOME_WIN_RATE_SAMPLE_N} 경기 데이터에서 측정한 홈 승률 {HOME_WIN_RATE_PCT.toFixed(2)}% 기반. 통계적 의미를
          가지지 않을 만큼 작아 보수적으로 +{HOME_ADVANTAGE_PCT.toFixed(1)}% 만 반영.
        </p>
      </section>

      <section id="agents" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold border-b border-gray-200 dark:border-brand-700 pb-2">
          4. AI 에이전트 토론
        </h2>
        <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
          정량 모델이 1차 승률을 계산한 뒤 Claude 3종 (Haiku × 2 + Sonnet × 1)
          이 토론을 진행합니다.
        </p>
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <h3 className="font-semibold mb-1">홈팀 에이전트 (Haiku)</h3>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
              홈팀 입장에서 우호적인 지표를 강조. &quot;선발 FIP 3.20 로 리그 상위
              10%, 최근 5경기 4승&quot; 등 옹호 논리 생성.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <h3 className="font-semibold mb-1">원정팀 에이전트 (Haiku)</h3>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
              원정팀 입장에서 우호적인 지표를 강조. 두 에이전트는 같은 raw 데이터
              를 받지만 서로 다른 각도로 해석.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <h3 className="font-semibold mb-1">심판 에이전트 (Sonnet)</h3>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
              양측 주장을 비교 (Steelman 원칙) 하여 정량 모델 결과에 ±5% 보정.
              승률을 {WINNER_PROB_CLAMP_MIN} ~ {WINNER_PROB_CLAMP_MAX} 범위로 제한 (극단 회피).
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
          경기 종료 후 심판 판정 vs 실제 결과를 비교하여 사후 분석 (회고). 자주
          틀리는 패턴은 팀별 메모리에 저장되어 다음 예측 시 프롬프트로 주입.
          모델이 자기 실수를 학습하는 구조입니다.
        </p>
      </section>

      <section id="verification" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold border-b border-gray-200 dark:border-brand-700 pb-2">
          5. 검증 방법
        </h2>
        <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
          예측이 맞았나 틀렸나 단순히 세는 것 외에 통계적으로 정밀한 두 지표를
          함께 사용합니다.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <h3 className="font-semibold mb-2">Brier Score</h3>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
              예측 승률과 실제 결과 (0 또는 1) 의 제곱 오차 평균. 낮을수록
              ↑정확. {BRIER_BASELINE} = 동전 던지기 수준, 0.20 이하 = 우수. 실측치는{" "}
              <Link href="/accuracy" className="text-brand-500 hover:underline">
                /accuracy
              </Link>{" "}
              페이지 참조.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <h3 className="font-semibold mb-2">Calibration</h3>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
              &quot;70% 확신 한 예측 중 실제 70% 가 맞아야 정상.&quot; 신뢰도와 실제 적중률
              의 일치도를 측정. <Link href="/accuracy" className="text-brand-500 hover:underline">/accuracy</Link>{" "}
              페이지에서 SVG 차트로 공개.
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
          매 예측의 입력 지표 · 예측 결과 · 실제 결과 · scoring_rule 버전이 모두
          데이터베이스에 저장됩니다. 사용자는{" "}
          <Link href="/predictions" className="text-brand-500 hover:underline">
            예측 기록
          </Link>{" "}
          페이지에서 과거 모든 예측을 검색 가능. 적중률 조작 X — 모든 결과가
          공개됩니다.
        </p>
      </section>

      <section id="history" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold border-b border-gray-200 dark:border-brand-700 pb-2">
          6. 모델 진화 History
        </h2>
        <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
          가중치는 고정 X. 누적 데이터로 통계적 유의미가 입증된 변경만 적용.
        </p>
        <ul className="space-y-3">
          {VERSION_HISTORY.map((v) => (
            <li
              key={v.version}
              className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]"
            >
              <div className="flex items-baseline justify-between mb-1 gap-2 flex-wrap">
                <h3 className="font-semibold">{v.version}</h3>
                <span className="text-xs text-gray-500 dark:text-brand-400">
                  {v.date}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
                {v.change}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section id="limits" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold border-b border-gray-200 dark:border-brand-700 pb-2">
          7. 한계 + 면책
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
          <li>
            우천 취소, 선수 부상 교체, 신예 데뷔 등 사전 측정 불가능한 변수는
            가중치에 반영되지 않습니다.
          </li>
          <li>
            KBO 한 시즌 720 경기 (정규 시즌) 의 표본은 메이저리그 (2430 경기) 의
            1/3 수준. 통계 모델의 정밀도 한계가 명확.
          </li>
          <li>
            예측은 통계 추정이며 결과를 보장하지 않습니다. 본 서비스는 스포츠
            토토·베팅 안내가 아니며, 도박 관련 정보를 제공하지 않습니다.
          </li>
          <li>
            데이터 소스 (KBO 공식 / Fancy Stats / FanGraphs) 가 갱신 지연 또는
            장애 발생 시 일부 경기 예측이 누락될 수 있습니다.
          </li>
        </ul>
      </section>

      <section className="space-y-4 pt-4 border-t border-gray-200 dark:border-brand-700">
        <h2 className="text-xl font-semibold">더 알아보기</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/about"
            className="rounded-lg border border-gray-200 dark:border-brand-700 p-3 hover:border-brand-500 transition-colors bg-white dark:bg-[var(--color-surface)]"
          >
            <h3 className="font-semibold mb-1">소개</h3>
            <p className="text-xs text-gray-600 dark:text-brand-400">
              서비스 정체성과 자주 묻는 질문.
            </p>
          </Link>
          <Link
            href="/glossary"
            className="rounded-lg border border-gray-200 dark:border-brand-700 p-3 hover:border-brand-500 transition-colors bg-white dark:bg-[var(--color-surface)]"
          >
            <h3 className="font-semibold mb-1">용어 사전</h3>
            <p className="text-xs text-gray-600 dark:text-brand-400">
              FIP · wOBA · WAR 등 {GLOSSARY_TERM_COUNT}개 지표 정의.
            </p>
          </Link>
          <Link
            href="/accuracy"
            className="rounded-lg border border-gray-200 dark:border-brand-700 p-3 hover:border-brand-500 transition-colors bg-white dark:bg-[var(--color-surface)]"
          >
            <h3 className="font-semibold mb-1">적중률</h3>
            <p className="text-xs text-gray-600 dark:text-brand-400">
              버전별 Brier Score 와 Calibration 차트.
            </p>
          </Link>
          <Link
            href="/insights"
            className="rounded-lg border border-gray-200 dark:border-brand-700 p-3 hover:border-brand-500 transition-colors bg-white dark:bg-[var(--color-surface)]"
          >
            <h3 className="font-semibold mb-1">AI 인사이트</h3>
            <p className="text-xs text-gray-600 dark:text-brand-400">
              심판 에이전트 reasoning timeline + 일자별 archive.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
