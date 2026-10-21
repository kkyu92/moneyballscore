import type { Metadata } from "next";
import { SITE_URL, SMALL_SAMPLE_N, MLB_TEAMS, mlbShortTeamName } from "@moneyball/shared";
import { buildMlbAccuracySummary, EMPTY_MLB_ACCURACY_SUMMARY } from "@/lib/mlb/buildMlbAccuracySummary";
import { buildAllMlbTeamAccuracy, buildMlbMatchupData, buildMlbTeamBiasAnalysis } from "@/lib/mlb/buildMlbTeamAccuracy";
import { buildMlbFactorAccuracy } from "@/lib/mlb/buildMlbFactorAccuracy";
import { buildMlbCommunityVsAI } from "@/lib/mlb/buildMlbCommunityAccuracy";
import type { CommunityVsAIResult } from "@/lib/picks/buildCommunityAccuracy";
import { captureFallback } from "@/lib/observability/captureFallback";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { MlbAccuracyDashboard } from "@/components/accuracy/MlbAccuracyDashboard";
import { FactorAccuracyTable } from "@/components/accuracy/FactorAccuracyTable";
import { TeamMatchupCards } from "@/components/accuracy/TeamMatchupCards";
import { TeamBiasTable } from "@/components/accuracy/TeamBiasTable";
import { CommunityVsAICard } from "@/components/accuracy/CommunityVsAICard";

const EMPTY_COMMUNITY_VS_AI: CommunityVsAIResult = {
  communityGames: 0,
  communityCorrect: 0,
  communityAccuracy: null,
  aiGamesWithPoll: 0,
  aiCorrectWithPoll: 0,
  aiAccuracyWithPoll: null,
};

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
  // 서버 장애(DB 연결 실패 등)로 인한 fallback 과 "실제 데이터 없음" 을 구분하기 위해
  // Promise.allSettled 로 각 fetch 의 성공/실패를 순수 파생값으로 추적 (컴포넌트 내 재할당
  // 금지 lint 룰 준수). KBO accuracy/page.tsx 와 동일 패턴(cycle 3247, 기존 Promise.all
  // 은 DB 장애가 발생해도 내부 builder 가 전부 fail-silent 로 흡수해 배너가 뜨지 않았음).
  const [summaryR, teamRowsR, matchupDataR, factorAccuracyRowsR, biasRowsR, communityStatsR] = await Promise.allSettled([
    buildMlbAccuracySummary('ko'),
    buildAllMlbTeamAccuracy(),
    buildMlbMatchupData(),
    buildMlbFactorAccuracy('ko'),
    buildMlbTeamBiasAnalysis(),
    buildMlbCommunityVsAI(),
  ]);
  const summary = summaryR.status === 'fulfilled' ? summaryR.value : captureFallback(summaryR.reason, EMPTY_MLB_ACCURACY_SUMMARY, { route: '/mlb/accuracy', source: 'buildMlbAccuracySummary' });
  const teamRowsResult = teamRowsR.status === 'fulfilled' ? teamRowsR.value : captureFallback(teamRowsR.reason, { rows: [], degraded: true } as Awaited<ReturnType<typeof buildAllMlbTeamAccuracy>>, { route: '/mlb/accuracy', source: 'buildAllMlbTeamAccuracy' });
  const matchupData = matchupDataR.status === 'fulfilled' ? matchupDataR.value : captureFallback(matchupDataR.reason, { matchups: [], homeAway: [], degraded: true } as Awaited<ReturnType<typeof buildMlbMatchupData>>, { route: '/mlb/accuracy', source: 'buildMlbMatchupData' });
  const factorAccuracyResult = factorAccuracyRowsR.status === 'fulfilled' ? factorAccuracyRowsR.value : captureFallback(factorAccuracyRowsR.reason, { rows: [], degraded: true } as Awaited<ReturnType<typeof buildMlbFactorAccuracy>>, { route: '/mlb/accuracy', source: 'buildMlbFactorAccuracy' });
  const biasRowsResult = biasRowsR.status === 'fulfilled' ? biasRowsR.value : captureFallback(biasRowsR.reason, { rows: [], degraded: true } as Awaited<ReturnType<typeof buildMlbTeamBiasAnalysis>>, { route: '/mlb/accuracy', source: 'buildMlbTeamBiasAnalysis' });
  const communityStatsResult = communityStatsR.status === 'fulfilled' ? communityStatsR.value : captureFallback(communityStatsR.reason, { stats: EMPTY_COMMUNITY_VS_AI, degraded: true } as Awaited<ReturnType<typeof buildMlbCommunityVsAI>>, { route: '/mlb/accuracy', source: 'buildMlbCommunityVsAI' });

  const teamRows = teamRowsResult.rows;
  const factorAccuracyRows = factorAccuracyResult.rows;
  const biasRows = biasRowsResult.rows;
  const communityStats = communityStatsResult.stats;

  // 각 builder 는 내부에서 DB 오류를 catch-and-log 로 흡수(fail-silent)하므로 Promise.allSettled
  // 의 reject 만으로는 장애를 못 잡음 — 각 반환값의 degraded 플래그를 합류 (cycle 3247 fix,
  // 기존엔 Promise.all + 이 6개 builder 가 전부 성공한 것처럼 보여 배너가 뜬 적이 없었음).
  const dbDegraded =
    [summaryR, teamRowsR, matchupDataR, factorAccuracyRowsR, biasRowsR, communityStatsR].some((r) => r.status === 'rejected') ||
    summary.degraded ||
    teamRowsResult.degraded ||
    matchupData.degraded ||
    factorAccuracyResult.degraded ||
    biasRowsResult.degraded ||
    communityStatsResult.degraded;

  const standingsAvailable = biasRows.some((r) => r.actualWinPct != null);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <Breadcrumb items={[{ label: 'MLB', href: '/mlb' }, { label: 'AI 적중 기록' }]} className="mb-2" />

      {dbDegraded && (
        <div
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          일시적인 서비스 장애로 일부 정보가 표시되지 않을 수 있습니다. 잠시 후 다시 시도해주세요.
        </div>
      )}

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
        winnerProbBuckets={summary.winnerProbBuckets}
        rollingAccuracy={summary.rollingAccuracy}
        brierTrend={summary.brierTrend}
        scoringRuleDayHeatmap={summary.scoringRuleDayHeatmap}
        cohortWeekHeatmap={summary.cohortWeekHeatmap}
        teamRows={teamRows}
      />

      <CommunityVsAICard stats={communityStats} locale="ko" />

      {biasRows.length > 0 && (
        <section id="bias" className="scroll-mt-20 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
          <div>
            <h2 className="text-lg font-bold">팀별 예측 편향 분석</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              모델이 특정 팀의 승리를 실제 승률 대비 얼마나 과잉/과소 예측하는지 보여줍니다.
              편향 갭이 큰 팀은 모델 진단 참고 지표입니다.
            </p>
          </div>
          <TeamBiasTable
            rows={biasRows}
            standingsAvailable={standingsAvailable}
            shortName={mlbShortTeamName}
            locale="ko"
            winPctSourceLabel="시즌 전체 완료 경기 기준"
          />
        </section>
      )}

      {matchupData.matchups.length > 0 && (
        <section id="matchup" className="scroll-mt-20 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold">팀별 상대 강약 분석</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              각 팀 경기에서 AI가 어떤 상대팀을 만날 때 잘 맞추고 못 맞추는지 분석합니다.
              경기 수가 적은({SMALL_SAMPLE_N}경기 미만) 결과는 연하게 표시됩니다. 홈/원정 적중률은 각 경기 수와 함께 표시합니다.
            </p>
          </div>
          <TeamMatchupCards
            matchups={matchupData.matchups}
            homeAway={matchupData.homeAway}
            teamAccuracy={teamRows}
            teamCodes={Object.keys(MLB_TEAMS)}
            shortName={mlbShortTeamName}
          />
        </section>
      )}

      {factorAccuracyRows.length > 0 && (
        <section id="factor-accuracy" className="scroll-mt-20 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
          <div>
            <h2 className="text-lg font-bold">팩터별 적중률</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              세이버메트릭스 팩터가 각각 경기 결과를 얼마나 잘 예측했는지 분석합니다.
              팩터 값이 특정 팀을 유리하다고 판단했을 때, 그 팀이 실제로 이긴 비율입니다.
            </p>
          </div>
          <FactorAccuracyTable
            rows={factorAccuracyRows}
            overallN={summary.verifiedN}
            overallAcc={summary.accuracyRate ?? 0}
            sport="mlb"
            locale="ko"
          />
        </section>
      )}

      <footer className="text-xs text-gray-400 dark:text-gray-500 space-y-1 border-t border-gray-200 dark:border-[var(--color-border)] pt-4">
        <p>• 이 페이지의 모든 데이터는 실제 MLB 경기 결과를 기준으로 자동 집계됩니다.</p>
        <p>• 예측은 정보 제공 목적이며, 베팅에 사용하지 마세요.</p>
      </footer>
    </main>
  );
}
