import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { WaitlistForm } from "@/components/mlb/WaitlistForm";

export const dynamic = "force-static";
export const revalidate = 86400;

const SITE_URL = "https://moneyballscore.vercel.app";

export const metadata: Metadata = {
  title: "MLB 분석 준비 중",
  description:
    "KBO에서 검증된 세이버메트릭스 10팩터 + AI 에이전트 토론을 MLB로 확장 준비 중. 출시 전 waitlist 가입으로 알림을 받으세요. 샘플 분석 — 2024 WS Game 1 NYY vs LAD 5 stat + 실제 결과 공개.",
  alternates: { canonical: `${SITE_URL}/mlb` },
  robots: { index: false, follow: false },
  openGraph: {
    title: "MLB 분석 준비 중 | MoneyBall Score",
    description:
      "KBO 세이버메트릭스 + AI 토론 모델, MLB 확장 waitlist 모집 중. 2024 WS Game 1 샘플 분석 공개.",
    url: `${SITE_URL}/mlb`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB 분석 준비 중 | MoneyBall Score",
    description:
      "KBO 검증 모델 MLB 확장 waitlist. 2024 WS Game 1 NYY vs LAD 샘플 분석.",
  },
};

const SAMPLE_STATS = [
  {
    label: "FIP",
    nyy: "3.42",
    lad: "3.18",
    note: "운/수비 제거한 투수 본인 실력. LAD 선발진 (Buehler + Glasnow) 우위.",
  },
  {
    label: "wOBA",
    nyy: ".342",
    lad: ".348",
    note: "타선 종합 생산성. 양팀 거의 동률, LAD 살짝 우위 (Ohtani/Betts/Freeman).",
  },
  {
    label: "WAR (팀 누적)",
    nyy: "48.2",
    lad: "52.7",
    note: "Wins Above Replacement. 시즌 전체 누적 전력. LAD +4.5 wins 우위.",
  },
  {
    label: "Statcast xwOBA",
    nyy: ".339",
    lad: ".351",
    note: "타구 quality 기반 expected wOBA. 운 제거 시 LAD 실측 wOBA 보다 ↑.",
  },
  {
    label: "Barrel%",
    nyy: "9.1%",
    lad: "10.4%",
    note: "강한 타구 비율 (98+ mph + 26-30° launch angle). LAD power upside ↑.",
  },
];

function SampleAnalysisCard() {
  return (
    <section
      aria-labelledby="sample-heading"
      className="rounded-2xl border border-brand-200 dark:border-brand-800 bg-white dark:bg-brand-950 p-6 md:p-8 shadow-sm"
    >
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h2
          id="sample-heading"
          className="text-xl md:text-2xl font-bold text-brand-700 dark:text-brand-100"
        >
          샘플 분석 — 2024 WS Game 1 NYY vs LAD
        </h2>
        <span className="text-xs text-brand-500 dark:text-brand-400 font-mono">
          2024-10-25
        </span>
      </div>

      <p className="text-sm text-brand-600 dark:text-brand-300 mb-6 leading-relaxed">
        MLB 모델 v1.0 베타 시뮬레이션. 실시간 분석 X — 모델 출시 후 매 경기 자동 박제.
        본 분석은 정적 demo 1건 (예시).
      </p>

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-brand-500 dark:text-brand-400 text-xs uppercase tracking-wide">
              <th className="text-left py-2 px-2 font-medium">지표</th>
              <th className="text-right py-2 px-2 font-medium">NYY</th>
              <th className="text-right py-2 px-2 font-medium">LAD</th>
              <th className="text-left py-2 px-2 font-medium">해석</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_STATS.map((s) => (
              <tr
                key={s.label}
                className="border-t border-brand-100 dark:border-brand-900"
              >
                <td className="py-2 px-2 font-medium text-brand-700 dark:text-brand-200">
                  {s.label}
                </td>
                <td className="text-right py-2 px-2 font-mono text-brand-600 dark:text-brand-300">
                  {s.nyy}
                </td>
                <td className="text-right py-2 px-2 font-mono text-brand-600 dark:text-brand-300">
                  {s.lad}
                </td>
                <td className="py-2 px-2 text-xs text-brand-500 dark:text-brand-400 leading-relaxed">
                  {s.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="rounded-lg bg-brand-50 dark:bg-brand-900/40 p-4">
          <div className="text-xs text-brand-500 dark:text-brand-400 uppercase tracking-wide mb-1">
            모델 v1.0 예측
          </div>
          <div className="text-base font-medium text-brand-700 dark:text-brand-100">
            LAD 55% / NYY 45%
          </div>
          <div className="text-xs text-brand-500 dark:text-brand-400 mt-1">
            FIP + WAR + xwOBA 기반. 박빙 (10% gap)
          </div>
        </div>
        <div className="rounded-lg bg-brand-50 dark:bg-brand-900/40 p-4">
          <div className="text-xs text-brand-500 dark:text-brand-400 uppercase tracking-wide mb-1">
            실제 결과
          </div>
          <div className="text-base font-medium text-brand-700 dark:text-brand-100">
            LAD 6 - 3 NYY
          </div>
          <div className="text-xs text-brand-500 dark:text-brand-400 mt-1">
            10회 walk-off HR — Freddie Freeman. 모델 PASS.
          </div>
        </div>
      </div>
    </section>
  );
}

function WaitlistFormSection() {
  return (
    <section
      aria-labelledby="waitlist-heading"
      className="rounded-2xl border border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/30 p-6 md:p-8"
    >
      <h2
        id="waitlist-heading"
        className="text-xl md:text-2xl font-bold text-brand-700 dark:text-brand-100 mb-2"
      >
        출시 알림 신청
      </h2>
      <p className="text-sm text-brand-600 dark:text-brand-300 mb-6 leading-relaxed">
        waitlist 100명 달성 또는 30일 내 출시 결정. 정식 출시 시 가입자에게 알림 발송.
      </p>

      <WaitlistForm />
    </section>
  );
}

export default function MLBLandingPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <Breadcrumb items={[{ label: "MLB 분석" }]} />

      <section
        aria-labelledby="hero-heading"
        className="text-center space-y-4 py-6 md:py-10"
      >
        <span className="inline-block rounded-full bg-brand-500 text-white text-xs font-bold px-3 py-1 tracking-wider uppercase">
          MLB
        </span>
        <h1
          id="hero-heading"
          className="text-3xl md:text-5xl font-bold text-brand-700 dark:text-brand-100 leading-tight"
        >
          MoneyBall Score
          <br />
          <span className="text-brand-500 dark:text-brand-300">
            MLB 분석 준비 중
          </span>
        </h1>
        <p className="text-base md:text-lg text-brand-600 dark:text-brand-300 max-w-xl mx-auto leading-relaxed">
          KBO에서 검증된 세이버메트릭스 10팩터 + AI 에이전트 토론을 MLB로 확장.
        </p>
      </section>

      <SampleAnalysisCard />

      <WaitlistFormSection />

      <section className="text-center text-sm text-brand-500 dark:text-brand-400 py-4">
        <p className="mb-2">
          본 페이지 = MLB 모델 출시 전 waitlist demand 측정 demo.
        </p>
        <p>
          KBO 정식 서비스 보러 가기 →{" "}
          <Link
            href="/"
            className="text-brand-600 dark:text-brand-300 underline underline-offset-2 hover:text-brand-700 dark:hover:text-brand-100"
          >
            오늘의 KBO 예측
          </Link>
        </p>
      </section>
    </main>
  );
}
