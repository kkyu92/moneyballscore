import type { Metadata } from "next";
import { DEFAULT_WEIGHTS } from "@moneyball/shared";

export const metadata: Metadata = {
  title: "소개",
  description:
    "MoneyBall Score 승부예측 방법론. 세이버메트릭스 기반 10팩터 3소스 가중합산 모델 v1.6.",
  alternates: { canonical: "https://moneyballscore.vercel.app/about" },
};

type FactorKey = keyof typeof DEFAULT_WEIGHTS;

const FACTORS: Array<{
  name: string;
  key: FactorKey;
  desc: string;
  source: string;
}> = [
  {
    name: "선발 투수력 (FIP)",
    key: "sp_fip",
    desc: "Fielding Independent Pitching. 수비와 무관한 투수 순수 실력 지표. ERA보다 미래 성적 예측에 정확.",
    source: "Fancy Stats",
  },
  {
    name: "선발 잠재력 (xFIP)",
    key: "sp_xfip",
    desc: "Expected FIP. 홈런율을 리그 평균으로 정규화한 FIP. 운의 영향을 제거.",
    source: "Fancy Stats",
  },
  {
    name: "타선 화력 (wOBA)",
    key: "lineup_woba",
    desc: "weighted On-Base Average. 단타/2루타/홈런 등 각 출루 방식에 가중치를 부여한 종합 타격 생산성.",
    source: "Fancy Stats",
  },
  {
    name: "불펜 안정성 (FIP)",
    key: "bullpen_fip",
    desc: "중계/마무리 투수진의 종합 FIP. 선발 강판 후 경기 결과에 큰 영향.",
    source: "Fancy Stats",
  },
  {
    name: "최근 폼",
    key: "recent_form",
    desc: "최근 10경기 승률. 시즌 전체 성적보다 현재 팀 상태를 반영.",
    source: "KBO 공식",
  },
  {
    name: "팀 전력 (Elo)",
    key: "elo",
    desc: "체스에서 유래한 상대적 전력 수치. 강팀을 이기면 많이 오르고, 약팀에 지면 많이 내려감.",
    source: "Fancy Stats",
  },
  {
    name: "WAR",
    key: "war",
    desc: "Wins Above Replacement. 대체 선수 대비 팀 승리 기여도 총합.",
    source: "Fancy Stats",
  },
  {
    name: "수비력 (SFR)",
    key: "sfr",
    desc: "Statcast Fielding Runs. 포지션별 수비 기여도 합산. 수비력이 실점에 미치는 영향.",
    source: "Fancy Stats",
  },
  {
    name: "상대전적",
    key: "head_to_head",
    desc: "시즌 상대전적 승률. 특정 팀 간 상성이 존재할 수 있음.",
    source: "KBO 공식",
  },
  {
    name: "구장 보정",
    key: "park_factor",
    desc: "홈구장 특성 보정. 타자 친화 구장과 투수 친화 구장의 차이를 반영.",
    source: "KBO 공식",
  },
];

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
    desc: "FIP, xFIP, WAR, wOBA, SFR, Elo 레이팅 (robots.txt 제한 없음)",
    color: "bg-accent",
  },
  {
    name: "FanGraphs",
    url: "fangraphs.com",
    desc: "wRC+, ISO, BB%/K% (보조 검증용)",
    color: "bg-brand-300",
  },
];

const FAQS = [
  {
    q: "MoneyBall Score는 어떻게 KBO 경기를 예측하나요?",
    a: "FIP, xFIP, wOBA, WAR, Elo 등 10개 세이버메트릭스 팩터를 가중합산한 정량 모델 v1.6과, 홈/원정/심판 3명의 AI 에이전트가 토론으로 보정하는 v2.0 시스템을 결합합니다. 각 경기 시작 3시간 전 최신 데이터로 개별 예측이 자동 생성됩니다.",
  },
  {
    q: "예측 적중률은 얼마인가요?",
    a: "정량 모델 v1.6은 시즌 누적 검증 경기 기준 적중률을 매일 업데이트해 대시보드에 공개합니다. 모든 예측이 사후 검증되며, 적중·오차 데이터는 모델 개선과 회고 분석에 다시 투입됩니다.",
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
];

export default function AboutPage() {
  const activeFactors = FACTORS.filter(
    (f) => DEFAULT_WEIGHTS[f.key] > 0,
  ).sort(
    (a, b) => DEFAULT_WEIGHTS[b.key] - DEFAULT_WEIGHTS[a.key],
  );
  const deprecatedFactors = FACTORS.filter(
    (f) => DEFAULT_WEIGHTS[f.key] === 0,
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
      <section>
        <h1 className="text-3xl font-bold mb-2">MoneyBall Score</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          세이버메트릭스 기반 프로야구 승부예측
        </p>
      </section>

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">예측 모델 v1.6</h2>
          <span className="text-xs px-2 py-1 bg-brand-100 text-brand-700 rounded-full font-medium">
            {activeFactors.length}팩터 사용 중
          </span>
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          세이버메트릭스 팩터를 3개 데이터 소스에서 수집하여 가중합산합니다.
          홈팀 어드밴티지(+1.5%p, 최근 3시즌 2,180경기 실제 홈 승률 51.93% ±2.1%p 기준)를
          추가 반영하며, 각 팩터를 상대 비교로 정규화한 후 최종 승리 확률을
          산출합니다. 2026-04 업데이트에서 실측 유의성이 부족한 3개 팩터를
          현재 모델에서 제외했습니다 (아래 참고).
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
                  <h3 className="font-semibold">{factor.name}</h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{factor.source}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{factor.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">
          활성 팩터 합계 {Math.round(activeWeightSum * 100)}% + 홈어드밴티지 1.5%p.
          남은 {Math.round((1 - activeWeightSum - 0.015) * 100)}%는 경기 간
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
                      {factor.name}
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

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">AI 에이전트 토론 v2.0</h2>
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

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
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
        className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6"
      >
        <h2 id="faq-title" className="text-xl font-bold mb-4">
          자주 묻는 질문 (FAQ)
        </h2>
        <div className="space-y-2">
          {FAQS.map((f, idx) => (
            <details
              key={idx}
              className="border-b border-gray-100 dark:border-gray-800 last:border-0 py-3"
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

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
        <h2 className="text-xl font-bold mb-3">업데이트 주기</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-surface rounded-lg">
            <p className="font-medium">매일 09:00 KST</p>
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
            <p className="text-gray-500 dark:text-gray-400">실시간 스코어 (네이버 API)</p>
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
