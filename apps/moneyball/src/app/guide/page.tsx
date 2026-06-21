import type { Metadata } from "next";
import Link from "next/link";
import { KBO_TEAM_COUNT, KBO_PREDICT_DAILY_TIME_KST, CURRENT_SCORING_RULE, SUNDAY_CAP_CONFIDENCE, WINNER_PROB_CONFIDENT, WINNER_PROB_LEAN, BRIER_BASELINE } from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { TableOfContents } from "@/components/shared/TableOfContents";

const TOC_ITEMS = [
  { id: "cards", label: "예측 카드 해석" },
  { id: "charts", label: "적중률 차트" },
  { id: "picks", label: "픽 기록 시작" },
  { id: "pages", label: "페이지별 활용" },
];

export const metadata: Metadata = {
  title: "사용 가이드",
  description:
    "MoneyBall Score 사용법 — 예측 카드 해석법, 적중률 차트 읽는 법, 픽 기록 시작하기, 모델 버전 의미. KBO 승부예측 사이트 처음 사용자를 위한 단계별 가이드.",
  alternates: { canonical: "https://moneyballscore.vercel.app/guide" },
  openGraph: {
    title: "사용 가이드 | MoneyBall Score",
    description:
      "예측 카드 해석 + 적중률 차트 읽기 + 픽 시작하기 + 모델 버전 의미. 처음 사용자를 위한 단계별 가이드.",
    url: "https://moneyballscore.vercel.app/guide",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "사용 가이드 | MoneyBall Score",
    description:
      "예측 카드 해석 + 적중률 차트 + 픽 시작하기. 단계별 가이드.",
  },
};

const GUIDE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "MoneyBall Score 사용 가이드",
  description: "예측 카드 해석 · 적중률 차트 · 픽 기록 시작 단계별 안내.",
  url: "https://moneyballscore.vercel.app/guide",
  publisher: {
    "@type": "Organization",
    name: "MoneyBall Score",
    url: "https://moneyballscore.vercel.app",
  },
  inLanguage: "ko-KR",
};

export default function GuidePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(GUIDE_JSONLD) }}
      />

      <Breadcrumb
        items={[
          { label: "소개", href: "/about" },
          { label: "사용 가이드" },
        ]}
      />

      <header className="space-y-3">
        <h1 className="text-3xl font-bold">사용 가이드</h1>
        <p className="text-base text-gray-600 dark:text-brand-300 leading-relaxed">
          처음 들어왔다면 이 페이지부터 읽어주세요. 예측 카드를 어떻게 해석하고,
          적중률 차트는 어떻게 보고, 픽 기록은 어떻게 시작하는지 단계별로
          설명합니다.
        </p>
      </header>

      <TableOfContents items={TOC_ITEMS} />

      <section id="cards" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold border-b border-gray-200 dark:border-brand-700 pb-2">
          1. 예측 카드 해석법
        </h2>
        <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
          홈 화면 (<Link href="/" className="text-brand-500 hover:underline">/</Link>) 의 매 카드 = 한 경기의 예측. 카드를 클릭하면{" "}
          <Link
            href="/analysis"
            className="text-brand-500 hover:underline"
          >
            /analysis
          </Link>{" "}
          상세 페이지로 이동합니다. 카드의 주요 요소:
        </p>
        <ul className="space-y-3">
          <li className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <h3 className="font-semibold mb-2">⓵ 예측 팀 + 신뢰도</h3>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
              예: &quot;LG 65%&quot; = LG 가 이길 확률을 모델이 65% 로 추정. 50% 에 가까우면
              박빙, 80% 이상이면 강한 예측. 신뢰도가 높다고 반드시 적중하는 건
              아니지만, 높은 신뢰도 예측이 누적 70% 이상 적중하면 모델이 잘
              보정된 것입니다.
            </p>
          </li>
          <li className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <h3 className="font-semibold mb-2">⓶ 티어 (강한 예측 / 보통 / 박빙)</h3>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
              신뢰도 기반 자동 분류. 강한 예측 (≥{WINNER_PROB_CONFIDENT}) · 보통 ({WINNER_PROB_LEAN}~{WINNER_PROB_CONFIDENT}) · 박빙
              (≤{WINNER_PROB_LEAN}). 박빙 예측은 적중률이 자연히 낮으니 베팅 참고로 부적합.
            </p>
          </li>
          <li className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <h3 className="font-semibold mb-2">⓷ AI 분석 요약</h3>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
              심판 에이전트 (Claude Sonnet) 가 정리한 한두 문장. 정량 모델 결과 +
              홈/원정 에이전트 토론 결과를 종합. &quot;에이전트 토론 불가&quot; 가 표시되면
              정량 모델만 가동된 fallback 결과 (드물지만 데이터 일시 장애 시).
            </p>
          </li>
          <li className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <h3 className="font-semibold mb-2">⓸ 경기 후 결과 표시</h3>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
              경기 종료 후 ✅ (적중) 또는 ❌ (오차) 표시 + 실제 스코어. 같은 카드
              그대로 결과 확인 가능 — 사후 조작 X.
            </p>
          </li>
        </ul>
      </section>

      <section id="charts" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold border-b border-gray-200 dark:border-brand-700 pb-2">
          2. 적중률 차트 읽는 법
        </h2>
        <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
          <Link href="/accuracy" className="text-brand-500 hover:underline">
            /accuracy
          </Link>{" "}
          페이지에서 모델 성능을 측정. 단순 적중률 외에 두 가지 정밀 지표를 함께
          공개합니다.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <h3 className="font-semibold mb-2">캘리브레이션 차트</h3>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed mb-2">
              X축 = 모델 신뢰도 구간 (50% ~ 100%). Y축 = 실제 적중률. 점이 대각선
              가까울수록 정상 보정. 대각선 아래쪽 = 과신 (over-confidence),
              위쪽 = 과소 (under-confidence).
            </p>
            <p className="text-xs text-gray-500 dark:text-brand-400">
              참고: 70% 신뢰도 구간의 점이 정확히 70% 적중률 = 이상적.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
            <h3 className="font-semibold mb-2">Brier Score</h3>
            <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed mb-2">
              예측 승률과 실제 결과 (0 또는 1) 의 제곱 오차 평균. {BRIER_BASELINE} = 동전
              던지기 / 0.20 이하 = 우수. 실측치는 /accuracy 페이지 참조.
            </p>
            <p className="text-xs text-gray-500 dark:text-brand-400">
              참고: 단순 적중률만 봤다면 잡지 못하는 신뢰도 보정 품질을 측정.
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-white dark:bg-[var(--color-surface)]">
          <h3 className="font-semibold mb-2">버전별 / 요일별 / 팀별 분해</h3>
          <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
            같은 페이지 하단에서 모델 버전별 (v1.5 / v1.6 / v1.7-revert / v1.8) /
            요일별 (월~일) / 팀별 ({KBO_TEAM_COUNT}팀) 적중률을 분해해서 확인 가능. 예:
            일요일 경기 적중률이 낮다는 사실을 발견하여 Sunday cap (일요일
            신뢰도 {SUNDAY_CAP_CONFIDENCE} 강등) 룰을 도입한 evidence 가 이 차트에 있습니다.
          </p>
        </div>
      </section>

      <section id="picks" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold border-b border-gray-200 dark:border-brand-700 pb-2">
          3. 픽 기록 시작하기
        </h2>
        <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
          단순 관전이 아니라 직접 적중률을 겨루고 싶다면 픽 기록 기능을
          사용하세요. 가입 없이 닉네임만 설정.
        </p>
        <ol className="list-decimal pl-5 space-y-3 text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
          <li>
            <strong>닉네임 설정</strong> —{" "}
            <Link href="/picks" className="text-brand-500 hover:underline">
              /picks
            </Link>{" "}
            첫 방문 시 닉네임 입력. 브라우저에 저장되어 다른 기기에서는 다른 픽
            기록.
          </li>
          <li>
            <strong>경기 픽 선택</strong> — 매 경기 카드에서 &quot;내가 누가 이긴다고
            생각하는지&quot; 미리 선택. 경기 시작 전까지 변경 가능.
          </li>
          <li>
            <strong>5건 누적</strong> — 픽 5건 이상 완료하면{" "}
            <Link href="/leaderboard" className="text-brand-500 hover:underline">
              /leaderboard
            </Link>{" "}
            에 자동 등재. 주간 / 시즌 적중률 순위가 표시됩니다.
          </li>
          <li>
            <strong>AI 대결 성적</strong> — 같은 경기에서 내 픽 vs AI 모델 픽
            대결 결과를 자동 비교. AI 를 이긴 적중률 / 진 적중률 / 같은 답
            적중률 3가지 측정.
          </li>
        </ol>
        <div className="rounded-lg border border-gray-200 dark:border-brand-700 p-4 bg-yellow-50 dark:bg-[var(--color-surface)]">
          <p className="text-sm text-gray-700 dark:text-brand-300 leading-relaxed">
            <strong>주의:</strong> 픽 기록은 분석·재미 목적이며 베팅 안내가
            아닙니다. 본 서비스는 스포츠 토토·도박 관련 정보를 제공하지 않습니다.
          </p>
        </div>
      </section>

      <section id="pages" className="space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-semibold border-b border-gray-200 dark:border-brand-700 pb-2">
          4. 페이지별 활용 방법
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link
            href="/"
            className="rounded-lg border border-gray-200 dark:border-brand-700 p-3 hover:border-brand-500 transition-colors bg-white dark:bg-[var(--color-surface)]"
          >
            <h3 className="font-semibold mb-1">홈</h3>
            <p className="text-xs text-gray-600 dark:text-brand-400">
              오늘 경기 예측 카드. 매일 {KBO_PREDICT_DAILY_TIME_KST} 갱신.
            </p>
          </Link>
          <Link
            href="/analysis"
            className="rounded-lg border border-gray-200 dark:border-brand-700 p-3 hover:border-brand-500 transition-colors bg-white dark:bg-[var(--color-surface)]"
          >
            <h3 className="font-semibold mb-1">AI 분석</h3>
            <p className="text-xs text-gray-600 dark:text-brand-400">
              팩터별 상세 분석. 빅매치 자동 선정.
            </p>
          </Link>
          <Link
            href="/predictions"
            className="rounded-lg border border-gray-200 dark:border-brand-700 p-3 hover:border-brand-500 transition-colors bg-white dark:bg-[var(--color-surface)]"
          >
            <h3 className="font-semibold mb-1">예측 기록</h3>
            <p className="text-xs text-gray-600 dark:text-brand-400">
              과거 모든 예측 검색. 날짜·팀·상태별 필터.
            </p>
          </Link>
          <Link
            href="/reviews"
            className="rounded-lg border border-gray-200 dark:border-brand-700 p-3 hover:border-brand-500 transition-colors bg-white dark:bg-[var(--color-surface)]"
          >
            <h3 className="font-semibold mb-1">예측 리뷰</h3>
            <p className="text-xs text-gray-600 dark:text-brand-400">
              주간 / 월간 결과 요약. 빗나간 예측 분석.
            </p>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-200 dark:border-brand-700 p-3 hover:border-brand-500 transition-colors bg-white dark:bg-[var(--color-surface)]"
          >
            <h3 className="font-semibold mb-1">모델 성능</h3>
            <p className="text-xs text-gray-600 dark:text-brand-400">
              내부 메트릭 대시보드. 가중치 분포.
            </p>
          </Link>
          <Link
            href="/standings"
            className="rounded-lg border border-gray-200 dark:border-brand-700 p-3 hover:border-brand-500 transition-colors bg-white dark:bg-[var(--color-surface)]"
          >
            <h3 className="font-semibold mb-1">팀 순위</h3>
            <p className="text-xs text-gray-600 dark:text-brand-400">
              현재 시즌 KBO {KBO_TEAM_COUNT}팀 순위 + 잔여 경기 예측.
            </p>
          </Link>
        </div>
      </section>

      <section className="space-y-4 pt-4 border-t border-gray-200 dark:border-brand-700">
        <h2 className="text-xl font-semibold">더 알아보기</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/methodology"
            className="rounded-lg border border-gray-200 dark:border-brand-700 p-3 hover:border-brand-500 transition-colors bg-white dark:bg-[var(--color-surface)]"
          >
            <h3 className="font-semibold mb-1">예측 방법론</h3>
            <p className="text-xs text-gray-600 dark:text-brand-400">
              {CURRENT_SCORING_RULE} 모델 가중치 + 데이터 소스 전체 공개.
            </p>
          </Link>
          <Link
            href="/glossary"
            className="rounded-lg border border-gray-200 dark:border-brand-700 p-3 hover:border-brand-500 transition-colors bg-white dark:bg-[var(--color-surface)]"
          >
            <h3 className="font-semibold mb-1">용어 사전</h3>
            <p className="text-xs text-gray-600 dark:text-brand-400">
              25 세이버메트릭스 지표 정의 + 우리 모델 가중치.
            </p>
          </Link>
          <Link
            href="/about"
            className="rounded-lg border border-gray-200 dark:border-brand-700 p-3 hover:border-brand-500 transition-colors bg-white dark:bg-[var(--color-surface)]"
          >
            <h3 className="font-semibold mb-1">소개 + FAQ</h3>
            <p className="text-xs text-gray-600 dark:text-brand-400">
              서비스 정체성 + 자주 묻는 질문 15건.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
