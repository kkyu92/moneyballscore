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
  title: "MLB AI Prediction Track Record | MoneyBall Score",
  description: "MLB AI prediction performance tracking. Accuracy, Brier score, calibration, and per-team accuracy breakdown.",
  alternates: {
    canonical: `${SITE_URL}/en/mlb/accuracy`,
    languages: { en: `${SITE_URL}/en/mlb/accuracy`, ko: `${SITE_URL}/mlb/accuracy` },
  },
  openGraph: {
    title: "MLB AI Prediction Track Record | MoneyBall Score",
    description: "MLB AI prediction performance. Brier score, per-team accuracy, calibration dashboard.",
    url: `${SITE_URL}/en/mlb/accuracy`,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default async function EnMlbAccuracyPage() {
  // KO page 와 동일 패턴(cycle 3247) — 6개 builder 가 전부 내부 DB 오류를 catch-and-log 로
  // 흡수(fail-silent)하므로 Promise.allSettled reject 만으론 장애를 못 잡음, 각 반환값의
  // degraded 플래그를 합류.
  const [summaryR, teamRowsR, matchupDataR, factorAccuracyRowsR, biasRowsR, communityStatsR] = await Promise.allSettled([
    buildMlbAccuracySummary('en'),
    buildAllMlbTeamAccuracy(),
    buildMlbMatchupData(),
    buildMlbFactorAccuracy('en'),
    buildMlbTeamBiasAnalysis(),
    buildMlbCommunityVsAI(),
  ]);
  const summary = summaryR.status === 'fulfilled' ? summaryR.value : captureFallback(summaryR.reason, EMPTY_MLB_ACCURACY_SUMMARY, { route: '/en/mlb/accuracy', source: 'buildMlbAccuracySummary' });
  const teamRowsResult = teamRowsR.status === 'fulfilled' ? teamRowsR.value : captureFallback(teamRowsR.reason, { rows: [], degraded: true } as Awaited<ReturnType<typeof buildAllMlbTeamAccuracy>>, { route: '/en/mlb/accuracy', source: 'buildAllMlbTeamAccuracy' });
  const matchupData = matchupDataR.status === 'fulfilled' ? matchupDataR.value : captureFallback(matchupDataR.reason, { matchups: [], homeAway: [], degraded: true } as Awaited<ReturnType<typeof buildMlbMatchupData>>, { route: '/en/mlb/accuracy', source: 'buildMlbMatchupData' });
  const factorAccuracyResult = factorAccuracyRowsR.status === 'fulfilled' ? factorAccuracyRowsR.value : captureFallback(factorAccuracyRowsR.reason, { rows: [], degraded: true } as Awaited<ReturnType<typeof buildMlbFactorAccuracy>>, { route: '/en/mlb/accuracy', source: 'buildMlbFactorAccuracy' });
  const biasRowsResult = biasRowsR.status === 'fulfilled' ? biasRowsR.value : captureFallback(biasRowsR.reason, { rows: [], degraded: true } as Awaited<ReturnType<typeof buildMlbTeamBiasAnalysis>>, { route: '/en/mlb/accuracy', source: 'buildMlbTeamBiasAnalysis' });
  const communityStatsResult = communityStatsR.status === 'fulfilled' ? communityStatsR.value : captureFallback(communityStatsR.reason, { stats: EMPTY_COMMUNITY_VS_AI, degraded: true } as Awaited<ReturnType<typeof buildMlbCommunityVsAI>>, { route: '/en/mlb/accuracy', source: 'buildMlbCommunityVsAI' });

  const teamRows = teamRowsResult.rows;
  const factorAccuracyRows = factorAccuracyResult.rows;
  const biasRows = biasRowsResult.rows;
  const communityStats = communityStatsResult.stats;

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
      <Breadcrumb items={[{ label: 'MLB', href: '/en/mlb' }, { label: 'AI Track Record' }]} className="mb-2" locale="en" />

      {dbDegraded && (
        <div
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          Some data may be temporarily unavailable due to a service disruption. Please try again shortly.
        </div>
      )}

      <header className="bg-gradient-to-r from-brand-800 to-brand-700 rounded-2xl p-6 md:p-8 text-white space-y-1">
        <h1 className="text-2xl font-bold">MLB AI Track Record</h1>
        <p className="text-sm text-white/70">
          A transparent look at how accurate MoneyBall Score AI is on MLB games — based on every verified game this season.
        </p>
      </header>

      <MlbAccuracyDashboard
        locale="en"
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

      <CommunityVsAICard stats={communityStats} locale="en" />

      {biasRows.length > 0 && (
        <section id="bias" className="scroll-mt-20 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
          <div>
            <h2 className="text-lg font-bold">Team Prediction Bias</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Shows how much the model over- or under-predicts each team&apos;s wins relative to
              their actual win rate. A large bias gap is a diagnostic signal for the model.
            </p>
          </div>
          <TeamBiasTable
            rows={biasRows}
            standingsAvailable={standingsAvailable}
            shortName={mlbShortTeamName}
            locale="en"
            winPctSourceLabel="completed games this season"
          />
        </section>
      )}

      {matchupData.matchups.length > 0 && (
        <section id="matchup" className="scroll-mt-20 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold">Team Matchup Strength</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Shows which opponents the AI predicts well or poorly for each team.
              Small-sample (n&lt;{SMALL_SAMPLE_N}) results are dimmed. Home/away accuracy shown with each n.
            </p>
          </div>
          <TeamMatchupCards
            matchups={matchupData.matchups}
            homeAway={matchupData.homeAway}
            teamAccuracy={teamRows}
            teamCodes={Object.keys(MLB_TEAMS)}
            shortName={mlbShortTeamName}
            locale="en"
          />
        </section>
      )}

      {factorAccuracyRows.length > 0 && (
        <section id="factor-accuracy" className="scroll-mt-20 bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 space-y-3">
          <div>
            <h2 className="text-lg font-bold">Factor Accuracy</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              How well each sabermetric factor predicted the actual game outcome —
              the rate at which the team a factor favored actually won.
            </p>
          </div>
          <FactorAccuracyTable
            rows={factorAccuracyRows}
            overallN={summary.verifiedN}
            overallAcc={summary.accuracyRate ?? 0}
            sport="mlb"
            locale="en"
          />
        </section>
      )}

      <footer className="text-xs text-gray-400 dark:text-gray-500 space-y-1 border-t border-gray-200 dark:border-[var(--color-border)] pt-4">
        <p>• All data on this page is computed automatically from actual MLB game results.</p>
        <p>• Predictions are for informational purposes only. Do not use for betting.</p>
      </footer>
    </main>
  );
}
