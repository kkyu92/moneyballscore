import type { Metadata } from "next";
import Link from "next/link";
import { MLB_FACTOR_COUNTS, MLB_ELO_K, MLB_ELO_K_POSTSEASON } from "@moneyball/kbo-data";
import {
  SITE_URL,
  MLB_SCORING_RULE,
  HOME_ADVANTAGE_PCT,
  MLB_TEAM_COUNT,
  MLB_HEAD_TO_HEAD_PAIRS,
} from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TableOfContents } from "@/components/shared/TableOfContents";

export const revalidate = 21600; // MLB_ISR_SECONDS (Next.js 16 Turbopack: literal required)

const TOTAL = MLB_FACTOR_COUNTS.total;
const TITLE_KO = "MLB 예측 방법론 | MoneyBall Score";
const SUMMARY_KO = `MoneyBall Score 가 MLB 승부예측을 만드는 전체 과정 — 데이터 소스, ${TOTAL}팩터 정량 모델, 검증 방법, KBO 모델과의 차이점.`;

const TOC_ITEMS = [
  { id: "principles", label: "핵심 원칙" },
  { id: "data-sources", label: "데이터 소스" },
  { id: "model", label: "정량 모델" },
  { id: "verification", label: "검증 방법" },
  { id: "limits", label: "한계 + 면책" },
];

export const metadata: Metadata = {
  title: TITLE_KO,
  description: SUMMARY_KO,
  alternates: {
    canonical: `${SITE_URL}/mlb/methodology`,
    languages: { en: `${SITE_URL}/en/mlb/methodology`, ko: `${SITE_URL}/mlb/methodology` },
  },
  openGraph: {
    title: TITLE_KO,
    description: SUMMARY_KO,
    url: `${SITE_URL}/mlb/methodology`,
    type: "article",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_KO,
    description: SUMMARY_KO,
  },
};

export default function MlbMethodologyPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "MLB 예측 방법론",
    description: SUMMARY_KO,
    url: `${SITE_URL}/mlb/methodology`,
    author: { "@type": "Organization", name: "MoneyBall Score" },
    about: { "@type": "Thing", name: "MLB sabermetrics prediction methodology" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/mlb/methodology` },
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb items={[{ href: "/mlb", label: "MLB 분석" }, { label: "예측 방법론" }]} />

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">MLB 예측 방법론</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          MLB 승부예측을 만드는 전체 과정을 숨김없이 공개합니다.
        </p>
      </header>

      <TableOfContents title="목차" items={TOC_ITEMS} />

      <section id="principles" className="space-y-3 scroll-mt-20">
        <h2 className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2">
          핵심 원칙
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          MLB 예측은 <strong>순수 정량 모델</strong>입니다. KBO 예측이 세이버메트릭스 팩터 + AI 에이전트 토론(judge
          agent) 두 layer 를 결합하는 것과 달리, MLB 는 {MLB_TEAM_COUNT}팀 {MLB_HEAD_TO_HEAD_PAIRS}개 매치업의 규모 때문에 LLM 토론 layer 없이{" "}
          {TOTAL}개 정량 팩터의 가중 합산만으로 승률을 산출합니다 (<code>scoring_rule=&apos;{MLB_SCORING_RULE}&apos;</code> 단일
          버전, KBO 처럼 매일 confidence 를 재판단하는 agent 개입 없음).
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          모든 팩터는 공개 데이터 소스에서만 가져오며, 각 팩터의 가중치와 산출 근거는{" "}
          <Link href="/mlb/factors" className="text-brand-600 dark:text-brand-300 hover:underline">
            {TOTAL}팩터 본선
          </Link>{" "}
          페이지에서 전체 공개합니다.
        </p>
      </section>

      <section id="data-sources" className="space-y-3 scroll-mt-20">
        <h2 className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2">
          데이터 소스
        </h2>
        <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-2 list-disc pl-5">
          <li>
            <strong>MLB Stats API</strong> (statsapi.mlb.com) — 일정, 결과, 최근 폼, 상대전적. 공식 라이브 데이터.
          </li>
          <li>
            <strong>Baseball Savant</strong> (Statcast) — xwOBA, Barrel%, 선발 xwOBA-against, wOBA 표준편차. 타구
            발사각·속도 기반 batted-ball 품질 측정, KBO 모델엔 없는 MLB 전용 layer.
          </li>
          <li>
            <strong>FanGraphs MLB</strong> — 선발/불펜 FIP·xFIP, 타선 wOBA, WAR, 수비 SFR.
          </li>
        </ul>
      </section>

      <section id="model" className="space-y-3 scroll-mt-20">
        <h2 className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2">
          정량 모델
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          KBO 10팩터 동등(FIP·xFIP·wOBA·불펜FIP·최근폼·WAR·상대전적·구장보정·Elo·수비SFR) + Statcast 전용 4팩터를
          더한 {TOTAL}팩터 가중 합산 모델입니다. 팀별 Elo 레이팅은 KBO Fancy Stats 처럼 외부에서 받아오지 않고
          자체 구현한 K-factor 갱신 로직(<code>K={MLB_ELO_K}</code>, 포스트시즌 <code>K={MLB_ELO_K_POSTSEASON}</code>{" "}
          — FiveThirtyEight MLB Elo 모델의 공개 문헌 값 인용)으로 경기 결과마다 갱신합니다. 홈팀에는 KBO 와 동일한
          실측 어드밴티지(+{HOME_ADVANTAGE_PCT.toFixed(1)}%p)를 가산합니다.
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          단, 최근폼·상대전적·수비 SFR 3개는 팀/매치업 페이지엔 참고용으로 표시되지만, 위 승률 계산 자체에는
          아직 팀 구분 없는 중립값이 고정 입력되어 반영되지 않습니다. Elo 는 위에서 설명한 갱신 로직의 결과값이
          실제 승률 계산에도 연결되어 있습니다.
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          가중치 표 전체와 각 팩터의 정의·출처는{" "}
          <Link href="/mlb/factors" className="text-brand-600 dark:text-brand-300 hover:underline">
            /mlb/factors
          </Link>{" "}
          에서 확인하세요.
        </p>
      </section>

      <section id="verification" className="space-y-3 scroll-mt-20">
        <h2 className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2">
          검증 방법
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          모든 예측은 경기 종료 후 자동 채점되어{" "}
          <Link href="/mlb/accuracy" className="text-brand-600 dark:text-brand-300 hover:underline">
            /mlb/accuracy
          </Link>{" "}
          에 실시간 공개됩니다. 적중률뿐 아니라 Brier 점수(신뢰도 보정 평가)와 캘리브레이션 차트를 함께 게시해
          &ldquo;확신했는데 틀렸다&rdquo; 류의 과신도 투명하게 드러냅니다.
        </p>
      </section>

      <section id="limits" className="space-y-3 scroll-mt-20">
        <h2 className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2">
          한계 + 면책
        </h2>
        <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-2 list-disc pl-5">
          <li>MLB 모델은 KBO 대비 운영 기간이 짧아 표본이 KBO 만큼 누적되지 않았습니다.</li>
          <li>LLM 토론 layer 가 없어 부상·트레이드 등 정성적 맥락은 팩터에 반영되지 않습니다.</li>
          <li>본 예측은 참고용 콘텐츠이며 배팅·투자 조언이 아닙니다.</li>
        </ul>
      </section>
    </main>
  );
}
