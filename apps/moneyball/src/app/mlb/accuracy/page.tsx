import type { Metadata } from "next";
import { SITE_URL } from "@moneyball/shared";
import { buildMlbAccuracySummary } from "@/lib/mlb/buildMlbAccuracySummary";
import { buildAllMlbTeamAccuracy } from "@/lib/mlb/buildMlbTeamAccuracy";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { MlbAccuracyDashboard } from "@/components/accuracy/MlbAccuracyDashboard";

export const revalidate = 3600; // ACCURACY_ISR_SECONDS (Next.js 16 Turbopack: literal required)

export const metadata: Metadata = {
  title: "MLB AI 예측 적중 기록 | MoneyBall Score",
  description: "MLB 경기 AI 승부예측 성과 트래킹. 정확도·Brier 점수·캘리브레이션·팀별 적중률 분석.",
  alternates: {
    canonical: `${SITE_URL}/mlb/accuracy`,
    languages: { en: `${SITE_URL}/en/mlb/accuracy`, ko: `${SITE_URL}/mlb/accuracy` },
  },
  openGraph: {
    title: "MLB AI 예측 적중 기록 | MoneyBall Score",
    description: "MLB 경기 AI 승부예측 성과. Brier 점수·팀별 적중률·캘리브레이션 대시보드.",
    url: `${SITE_URL}/mlb/accuracy`,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default async function MlbAccuracyPage() {
  const [summary, teamRows] = await Promise.all([
    buildMlbAccuracySummary('ko'),
    buildAllMlbTeamAccuracy(),
  ]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <Breadcrumb items={[{ label: 'MLB', href: '/mlb' }, { label: 'AI 적중 기록' }]} className="mb-2" />

      <header className="bg-gradient-to-r from-brand-800 to-brand-700 rounded-2xl p-6 md:p-8 text-white space-y-1">
        <h1 className="text-2xl font-bold">MLB AI 적중 기록</h1>
        <p className="text-sm text-white/70">
          MoneyBall Score AI가 MLB 경기에서 얼마나 정확한지 솔직하게 공개합니다. 시즌 내 모든 검증 완료 경기 기준.
        </p>
      </header>

      <MlbAccuracyDashboard
        locale="ko"
        verifiedN={summary.verifiedN}
        correctN={summary.correctN}
        accuracyRate={summary.accuracyRate}
        brier={summary.brier}
        gap={summary.gap}
        buckets={summary.buckets}
        confidenceTiers={summary.confidenceTiers}
        teamRows={teamRows}
      />

      <footer className="text-xs text-gray-400 dark:text-gray-500 space-y-1 border-t border-gray-200 dark:border-[var(--color-border)] pt-4">
        <p>• 이 페이지의 모든 데이터는 실제 MLB 경기 결과를 기준으로 자동 집계됩니다.</p>
        <p>• 예측은 정보 제공 목적이며, 베팅에 사용하지 마세요.</p>
      </footer>
    </main>
  );
}
