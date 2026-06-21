import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_WEIGHTS, HOME_ADVANTAGE, KBO_FACTOR_COUNT, KBO_PREDICT_DAILY_TIME_KST } from "@moneyball/shared";
import {
  FANGRAPHS_AUX_METRICS,
  MetricRegistry,
} from "@moneyball/kbo-data";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TableOfContents } from "@/components/shared/TableOfContents";
import { FACTOR_LABELS_TECHNICAL } from "@/lib/predictions/factorLabels";

const TOC_ITEMS = [
  { id: "model", label: "예측 모델" },
  { id: "agents", label: "AI 에이전트 토론" },
  { id: "data-sources", label: "데이터 소스" },
  { id: "faq-title", label: "FAQ" },
  { id: "schedule", label: "업데이트 주기" },
];

export const metadata: Metadata = {
  title: "소개",
  description: `MoneyBall Score 승부예측 방법론. 세이버메트릭스 기반 ${KBO_FACTOR_COUNT}팩터 3소스 가중합산 정량 모델.`,
  alternates: { canonical: "https://moneyballscore.vercel.app/about" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://moneyballscore.vercel.app/about",
    siteName: "MoneyBall Score",
    title: "소개 | MoneyBall Score",
    description: `MoneyBall Score 승부예측 방법론 — 세이버메트릭스 기반 ${KBO_FACTOR_COUNT}팩터 3소스 가중합산 정량 모델.`,
  },
  twitter: {
    card: "summary_large_image",
    title: "소개 | MoneyBall Score",
    description: `세이버메트릭스 ${KBO_FACTOR_COUNT}팩터 3소스 정량 모델 — 승부예측 방법론.`,
  },
};

type FactorKey = keyof typeof DEFAULT_WEIGHTS;

const FACTORS: Array<{
  key: FactorKey;
  desc: string;
  source: string;
}> = [
  {
    key: "sp_fip",
    desc: "Fielding Independent Pitching. 수비와 무관한 투수 순수 실력 지표. ERA보다 미래 성적 예측에 정확.",
    source: "Fancy Stats",
  },
  {
    key: "sp_xfip",
    desc: "Expected FIP. 홈런율을 리그 평균으로 정규화한 FIP. 운의 영향을 제거.",
    source: "Fancy Stats",
  },
  {
    key: "lineup_woba",
    desc: "weighted On-Base Average. 단타/2루타/홈런 등 각 출루 방식에 가중치를 부여한 종합 타격 생산성.",
    source: "Fancy Stats",
  },
  {
    key: "bullpen_fip",
    desc: "중계/마무리 투수진의 종합 FIP. 선발 강판 후 경기 결과에 큰 영향.",
    source: "Fancy Stats",
  },
  {
    key: "recent_form",
    desc: "최근 10경기 승률. 시즌 전체 성적보다 현재 팀 상태를 반영.",
    source: "KBO 공식",
  },
  {
    key: "elo",
    desc: "체스에서 유래한 상대적 전력 수치. 강팀을 이기면 많이 오르고, 약팀에 지면 많이 내려감.",
    source: "Fancy Stats",
  },
  {
    key: "war",
    desc: "Wins Above Replacement. 대체 선수 대비 팀 승리 기여도 총합.",
    source: "Fancy Stats",
  },
  {
    key: "sfr",
    desc: "Sabermetric Fielding Runs. KBO Fancy Stats 수비 지표로 포지션별 기여도 합산. 수비력이 실점에 미치는 영향.",
    source: "Fancy Stats",
  },
  {
    key: "head_to_head",
    desc: "시즌 상대전적 승률. 특정 팀 간 상성이 존재할 수 있음.",
    source: "KBO 공식",
  },
  {
    key: "park_factor",
    desc: "홈구장 특성 보정. 타자 친화 구장과 투수 친화 구장의 차이를 반영.",
    source: "KBO 공식",
  },
];

// MetricRegistry + FANGRAPHS_AUX_METRICS source-of-truth — silent drift family
// wave 69 (cycle 1269). hardcoded "FIP, xFIP, WAR, wOBA, SFR, Elo" + "wRC+, ISO, BB%/K%"
// → registry filter (methodology page wave 68 패턴 정합).
const FANCYSTATS_PRODUCTION_LABEL = Object.values(MetricRegistry)
  .filter((m) => m.source === "fancystats" && m.weight_v18 > 0)
  .map((m) => m.ko_name)
  .join(", ");
const FANGRAPHS_AUX_LABEL = FANGRAPHS_AUX_METRICS.join(", ");

const DATA_SOURCES = [
  {
    name: "KBO 공식",
    url: "koreabaseball.com",
    desc: "경기일정, 선발확정, 결과, 최근폼, 상대전적, 구장별 기록",
    color: "bg-brand-500",
  },
  {
    name: "KBO Fancy Stats",
    url: "kbofancystats.com",
    desc: `${FANCYSTATS_PRODUCTION_LABEL} (robots.txt 제한 없음)`,
    color: "bg-accent",
  },
  {
    name: "FanGraphs",
    url: "fangraphs.com",
    desc: `${FANGRAPHS_AUX_LABEL} (보조 검증용)`,
    color: "bg-brand-300",
  },
];

const FAQS = [
  {
    q: "MoneyBall Score는 어떻게 KBO 경기를 예측하나요?",
    a: `FIP, xFIP, wOBA, WAR, Elo 등 ${KBO_FACTOR_COUNT}개 세이버메트릭스 팩터를 가중합산한 정량 모델과, 홈/원정/심판 3명의 AI 에이전트가 토론으로 보정하는 시스템을 결합합니다. 각 경기 시작 3시간 전 최신 데이터로 개별 예측이 자동 생성됩니다.`,
  },
  {
    q: "예측 적중률은 얼마인가요?",
    a: "정량 모델 누적 검증 경기 기준 적중률을 매일 업데이트해 대시보드에 공개합니다. 모든 예측이 사후 검증되며, 적중·오차 데이터는 모델 개선과 회고 분석에 다시 투입됩니다.",
  },
  {
    q: "데이터는 어디서 가져오나요?",
    a: "KBO 공식 사이트(koreabaseball.com), KBO Fancy Stats(kbofancystats.com), FanGraphs(fangraphs.com/leaders/international/kbo) 3개 소스를 매일 정해진 시각에 자동 수집합니다. 각 사이트의 robots.txt와 서버 부하 기준을 준수합니다.",
  },
  {
    q: "유료인가요? 가입이 필요한가요?",
    a: "전부 무료이며 가입 없이 모든 페이지를 열람할 수 있습니다. 운영 비용은 광고 수익으로 충당합니다.",
  },
  {
    q: "예측이 틀렸을 때는 어떻게 되나요?",
    a: "경기 종료 직후 사후분석(Postview) 에이전트가 어떤 팩터의 예측이 빗나갔는지 자동으로 진단하고, 그 결과를 Compound 루프로 다음 예측에 반영합니다. 주간/월간 리뷰 페이지에서 팀별·팩터별 적중률 변화를 확인할 수 있습니다.",
  },
  {
    q: "이 사이트의 예측을 도박에 사용해도 되나요?",
    a: "MoneyBall Score는 데이터 분석 콘텐츠로, 어떤 형태의 도박이나 베팅도 권장하지 않습니다. 예측은 통계적 추정에 불과하며, 실제 경기 결과는 다를 수 있습니다.",
  },
  {
    q: "AI 에이전트 토론은 무엇을 기반으로 하나요?",
    a: "Anthropic Claude 모델(Haiku + Sonnet)을 사용합니다. 홈/원정 에이전트는 정량 데이터와 팀 페르소나를 입력받아 각자 입장에서 논거를 제시하고, 심판 에이전트가 양측 논거를 평가해 최종 확률을 결정합니다(Steelman 원칙).",
  },
  {
    q: "예측 카드에 표시되는 신뢰도 70% 는 어떤 의미인가요?",
    a: "그 팀이 이길 확률을 모델이 70% 로 추정했다는 뜻입니다. 70% 확신 한 예측이 100건 누적되면 그 중 약 70건이 맞아야 모델이 정상 보정됐다고 봅니다(Calibration). /accuracy 페이지의 캘리브레이션 차트에서 신뢰도 구간별 실제 적중률을 SVG 로 확인할 수 있습니다.",
  },
  {
    q: "왜 가끔 예측이 50:50 으로 표시되나요?",
    a: "두 팀의 종합 전력이 거의 동일하다고 모델이 판단한 경우입니다. 박빙 경기는 변수가 많아 일부러 극단으로 보정하지 않습니다(심판 에이전트가 0.15 ~ 0.85 범위로 제한). 박빙 예측은 적중률이 자연히 낮으니 베팅 참고로 부적합합니다.",
  },
  {
    q: "팀 페이지의 파크팩터(Park Factor) 는 무엇인가요?",
    a: "구장의 득점 환경 차이를 100 기준으로 표시한 지표입니다. 105 이상 = 타자 친화 (홈런·득점 많음), 95 이하 = 투수 친화. 잠실 (LG/OB) 은 투수 친화로, 사직 (LT) 은 중립으로, 광주 KIA 챔피언스 필드는 타자 친화로 분류됩니다.",
  },
  {
    q: "특정 경기가 예측 목록에 없는 이유가 무엇인가요?",
    a: "선발 투수가 경기 직전까지 확정되지 않거나, 우천 취소 발표, 데이터 소스 일시 장애 등의 경우 예측이 누락될 수 있습니다. 누락된 경기는 결과만 사후 기록되며 적중률 분모에 포함되지 않습니다(공정성).",
  },
  {
    q: "모델 버전 v1.8 은 무엇을 의미하나요?",
    a: "현재 가동 중인 가중치 조합 버전입니다. v1.8 (2026-05-12 ~) 의 변경: head_to_head 가중치 5% → 3% 축소(표본 부족 노이즈 인정), elo 가중치 8% → 10% 확대(정보가치 ↑). 일요일 경기는 신뢰도 0.55 초과 시 0.45 로 강등(Sunday cap). 누적 검증 표본 n=150 도달 시 v2.0 전면 재조정 예정. 자세한 진화 history 는 /methodology 페이지 참조.",
  },
  {
    q: "픽 기록은 어떻게 시작하나요?",
    a: "/picks 페이지에서 닉네임을 설정하면 매 경기마다 어느 팀이 이길지 미리 선택할 수 있습니다. 5건 이상 완료하면 /leaderboard 에 자동 등재되어 다른 사용자와 적중률을 겨룰 수 있고, 같은 경기에서 AI 모델과의 대결 성적도 함께 표시됩니다.",
  },
  {
    q: "예측 결과는 어디에 저장되며 검색 가능한가요?",
    a: "모든 예측은 입력 지표·예측 결과·실제 결과·모델 버전과 함께 데이터베이스에 저장되며, /predictions 페이지에서 날짜·팀별로 검색할 수 있습니다. 사후 조작은 불가능하며 적중·오차 데이터 전부가 공개됩니다.",
  },
  {
    q: "사이트 운영자는 누구이며 수익 모델은 무엇인가요?",
    a: "개인 개발자가 운영하는 무료 분석 서비스입니다. 운영 비용은 Google AdSense 광고 수익으로 충당하며, 어떤 형태의 베팅·도박 안내도 하지 않습니다. 데이터 오류·문의는 /contact 페이지를 이용해주세요.",
  },
];

export default function AboutPage() {
  const activeFactors = FACTORS.filter(
    (f) => (DEFAULT_WEIGHTS[f.key] as number) > 0,
  ).sort(
    (a, b) => DEFAULT_WEIGHTS[b.key] - DEFAULT_WEIGHTS[a.key],
  );
  const deprecatedFactors = FACTORS.filter(
    (f) => (DEFAULT_WEIGHTS[f.key] as number) === 0,
  );
  const activeWeightSum = activeFactors.reduce(
    (a, f) => a + DEFAULT_WEIGHTS[f.key],
    0,
  );

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Breadcrumb items={[{ label: '소개' }]} />
      <section>
        <h1 className="text-3xl font-bold mb-2">MoneyBall Score</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          세이버메트릭스 기반 프로야구 승부예측
        </p>
      </section>

      <TableOfContents items={TOC_ITEMS} />

      <section id="model" className="scroll-mt-20 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-bold">예측 모델</h2>
          <div className="flex items-center gap-2">
            <Link
              href="/glossary"
              className="text-xs px-2 py-1 rounded-full border border-brand-200 dark:border-brand-700 text-brand-600 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900 transition-colors"
            >
              용어 자세히 →
            </Link>
            <span className="text-xs px-2 py-1 bg-brand-100 text-brand-700 rounded-full font-medium">
              {activeFactors.length}팩터 사용 중
            </span>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          세이버메트릭스 팩터를 3개 데이터 소스에서 수집하여 가중합산합니다.
          홈팀 어드밴티지(+1.5%p, 최근 3시즌 2,180경기 실제 홈 승률 51.93% ±2.1%p 기준)를
          추가 반영하며, 각 팩터를 상대 비교로 정규화한 후 최종 승리 확률을
          산출합니다. 1개월 운영 측정에서 가중치를 재조정해 {KBO_FACTOR_COUNT}개 팩터를
          모두 활용합니다.
        </p>

        <div className="space-y-3 mt-6">
          {activeFactors.map((factor) => (
            <div
              key={factor.key}
              className="flex items-start gap-4 p-4 bg-surface rounded-lg"
            >
              <div className="text-right min-w-[50px]">
                <span className="text-xl font-bold font-mono text-brand-600">
                  {Math.round(DEFAULT_WEIGHTS[factor.key] * 100)}%
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{FACTOR_LABELS_TECHNICAL[factor.key]}</h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{factor.source}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{factor.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">
          활성 팩터 합계 {Math.round(activeWeightSum * 100)}% + 홈어드밴티지 {(HOME_ADVANTAGE * 100).toFixed(1)}%p.
          남은 {Math.round((1 - activeWeightSum - HOME_ADVANTAGE) * 100)}%는 경기 간
          무작위 변동성으로 설명되지 않는 영역.
        </p>

        {deprecatedFactors.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-[var(--color-border)]">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">
              현재 제외된 팩터
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">
              2023-2024 실측 데이터 logistic 학습 결과, 아래 3개 팩터는
              개별 기여도가 예측 오차 범위 안 (95% 신뢰구간이 0을 포함).
              데이터 근거 확보 전까지 가중치 0으로 설정했습니다.
            </p>
            <div className="space-y-2">
              {deprecatedFactors.map((factor) => (
                <div
                  key={factor.key}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-[var(--color-surface-card)] rounded-md border border-gray-200 dark:border-[var(--color-border)] opacity-75"
                >
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      제외
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {FACTOR_LABELS_TECHNICAL[factor.key]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                    {factor.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section id="agents" className="scroll-mt-20 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">AI 에이전트 토론</h2>
          <span className="text-xs px-2 py-1 bg-accent/20 text-accent rounded-full font-medium">
            debate
          </span>
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          정량 모델 결과를 AI 에이전트들이 토론을 통해 보정합니다.
          각 에이전트는 팀 성격에 맞는 페르소나를 가지고, 데이터를 해석하며 논쟁합니다.
        </p>
        <div className="space-y-3 mt-4">
          <div className="p-4 bg-brand-50 dark:bg-[var(--color-surface-card)] rounded-lg border border-brand-100 dark:border-[var(--color-border)]">
            <h3 className="font-semibold text-brand-700 dark:text-brand-300">홈팀 에이전트</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">홈팀 관점에서 유리한 근거를 제시. 팀 페르소나 + 라이벌 기억 활용.</p>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-[var(--color-surface-card)] rounded-lg border border-orange-100 dark:border-[var(--color-border)]">
            <h3 className="font-semibold text-[var(--color-away)]">원정팀 에이전트</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">원정팀 관점에서 반론 제시. 홈팀 약점과 원정팀 강점을 강조.</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-[var(--color-surface-card)] rounded-lg border border-gray-200 dark:border-[var(--color-border)]">
            <h3 className="font-semibold">심판 에이전트 (Sonnet)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">양측 논거를 평가하고, 정량 모델 결과와 종합하여 최종 승리 확률 결정. Steelman 원칙 적용.</p>
          </div>
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          경기 종료 후 사후 분석(Postview) 에이전트가 어떤 팩터가 틀렸는지 자동 진단하고, Compound 루프로 다음 예측에 반영합니다.
        </p>
      </section>

      <section id="data-sources" className="scroll-mt-20 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
        <h2 className="text-xl font-bold mb-4">데이터 소스</h2>
        <div className="space-y-3">
          {DATA_SOURCES.map((source) => (
            <div key={source.name} className="flex items-start gap-3">
              <span className={`w-2 h-2 mt-2 ${source.color} rounded-full shrink-0`} />
              <div>
                <span className="font-medium">{source.name}</span>
                <span className="text-sm text-gray-400 dark:text-gray-500 ml-2">({source.url})</span>
                <p className="text-sm text-gray-600 dark:text-gray-300">{source.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="faq-title"
        className="scroll-mt-20 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6"
      >
        <h2 id="faq-title" className="text-xl font-bold mb-4">
          자주 묻는 질문 (FAQ)
        </h2>
        <div className="space-y-2">
          {FAQS.map((f, idx) => (
            <details
              key={idx}
              className="border-b border-gray-100 dark:border-[var(--color-border)] last:border-0 py-3"
            >
              <summary className="font-medium cursor-pointer text-gray-800 dark:text-gray-100 hover:text-brand-600 dark:hover:text-brand-300 list-none flex items-start gap-2">
                <span className="text-brand-500 mt-0.5" aria-hidden>
                  Q.
                </span>
                <span className="flex-1">{f.q}</span>
              </summary>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 pl-6 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section id="schedule" className="scroll-mt-20 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
        <h2 className="text-xl font-bold mb-3">업데이트 주기</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-surface rounded-lg">
            <p className="font-medium">매일 {KBO_PREDICT_DAILY_TIME_KST}</p>
            <p className="text-gray-500 dark:text-gray-400">오늘 경기 + 예측 예고 (Telegram)</p>
          </div>
          <div className="p-3 bg-surface rounded-lg">
            <p className="font-medium">경기 시작 3h 전</p>
            <p className="text-gray-500 dark:text-gray-400">개별 예측 생성 (매 정시)</p>
          </div>
          <div className="p-3 bg-surface rounded-lg">
            <p className="font-medium">매일 23:00 KST</p>
            <p className="text-gray-500 dark:text-gray-400">경기 결과 + 적중률 업데이트</p>
          </div>
          <div className="p-3 bg-surface rounded-lg">
            <p className="font-medium">경기 중 30초 간격</p>
            <p className="text-gray-500 dark:text-gray-400">실시간 스코어 (KBO 공식 API)</p>
          </div>
          <div className="p-3 bg-surface rounded-lg">
            <p className="font-medium">경기 종료 자동</p>
            <p className="text-gray-500 dark:text-gray-400">사후분석 + Compound 루프</p>
          </div>
        </div>
      </section>
    </div>
  );
}
