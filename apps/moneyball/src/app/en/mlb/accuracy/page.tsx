import type { Metadata } from "next";
import { SITE_URL, MLB_TEAMS, mlbShortTeamName } from "@moneyball/shared";
import { buildMlbAccuracySummary } from "@/lib/mlb/buildMlbAccuracySummary";
import { buildAllMlbTeamAccuracy, buildMlbMatchupData, buildMlbTeamBiasAnalysis } from "@/lib/mlb/buildMlbTeamAccuracy";
import { buildMlbFactorAccuracy } from "@/lib/mlb/buildMlbFactorAccuracy";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { MlbAccuracyDashboard } from "@/components/accuracy/MlbAccuracyDashboard";
import { FactorAccuracyTable } from "@/components/accuracy/FactorAccuracyTable";
import { TeamMatchupCards } from "@/components/accuracy/TeamMatchupCards";
import { TeamBiasTable } from "@/components/accuracy/TeamBiasTable";

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
  const [summary, teamRows, matchupData, factorAccuracyRows, biasRows] = await Promise.all([
    buildMlbAccuracySummary('en'),
    buildAllMlbTeamAccuracy(),
    buildMlbMatchupData(),
    buildMlbFactorAccuracy('en'),
    buildMlbTeamBiasAnalysis(),
  ]);
  const standingsAvailable = biasRows.some((r) => r.actualWinPct != null);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <Breadcrumb items={[{ label: 'MLB', href: '/en/mlb' }, { label: 'AI Track Record' }]} className="mb-2" locale="en" />

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
              n=1 results are dimmed (single-game sample). Home/away accuracy shown with each n.
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
