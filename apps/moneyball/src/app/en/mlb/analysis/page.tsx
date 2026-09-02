import type { Metadata } from "next";
import Link from "next/link";
import {
  SITE_URL,
  MLB_FACTOR_PICK_STRONG,
  MLB_FACTOR_PICK_COMPLETE,
  FACTOR_PICK_TOP_GAMES,
  TOP_PICK_CONF_MIN,
  confToWinProb,
} from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { PickButton } from "@/components/picks/PickButton";
import { MlbTeamStrengthGrid } from "@/components/analysis/MlbTeamStrengthGrid";
import { YesterdayStatusFilter } from "@/components/analysis/YesterdayStatusFilter";
import { createClient } from "@/lib/supabase/server";
import { buildMlbAccuracySummary } from "@/lib/mlb/buildMlbAccuracySummary";
import { buildMlbTeamStrengthSnapshot } from "@/lib/mlb/buildMlbTeamStrengthSnapshot";
import { getCurrentWeek } from "@/lib/reviews/computeWeekRange";
import { getCurrentMonth } from "@/lib/reviews/computeMonthRange";
import {
  getTodayMlbAnalysisRows,
  getMlbThisWeekRemainingGames,
  groupMlbGamesByDate,
  getMlbYesterdayResults,
  getMlbPeriodStats,
} from "@/app/mlb/analysis/analysis-data";

export const revalidate = 1800; // MLB_LIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

// KO /mlb/analysis 와 동일 임계값 (wave-624 parity, en 미러도 동일 기준 유지).
const TOP_PICK_MIN_WIN_PCT = Math.round(confToWinProb(TOP_PICK_CONF_MIN) * 100);

export const metadata: Metadata = {
  title: "MLB AI Analysis Hub — Today's Picks, Big Match & Factor Convergence | MoneyBall Score",
  description:
    "All of today's MLB AI analysis in one place — today's big match, factor convergence picks, and every prediction.",
  alternates: {
    canonical: `${SITE_URL}/en/mlb/analysis`,
    languages: {
      en: `${SITE_URL}/en/mlb/analysis`,
      ko: `${SITE_URL}/mlb/analysis`,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "MoneyBall Score",
    title: "MLB AI Analysis Hub",
    description: "Today's MLB AI analysis — big match, factor convergence picks, and every prediction.",
    url: `${SITE_URL}/en/mlb/analysis`,
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB AI Analysis Hub",
    description: "Today's MLB AI analysis — big match, factor convergence picks, and every prediction.",
  },
};

export default async function MlbAnalysisPageEn() {
  const today = new Date().toISOString().slice(0, 10);
  const currentWeek = getCurrentWeek(new Date(), 'en');
  const currentMonth = getCurrentMonth(new Date(), 'en');
  const supabase = await createClient();
  const [rows, weekRemainingGames, yesterdayGames, weeklyStats, monthlyStats, accuracySummary, teamStrengthRows] = await Promise.all([
    getTodayMlbAnalysisRows(supabase, today),
    getMlbThisWeekRemainingGames(today),
    getMlbYesterdayResults(),
    getMlbPeriodStats(currentWeek.startDate, currentWeek.endDate),
    getMlbPeriodStats(currentMonth.startDate, currentMonth.endDate),
    buildMlbAccuracySummary('en'),
    buildMlbTeamStrengthSnapshot(),
  ]);
  const weekRemainingByDate = groupMlbGamesByDate(weekRemainingGames);

  // wave-624 KBO 대응(en 미러) — 최고 자신감 픽 = 오늘의 빅매치, confidence 기반 (KO 동일 로직).
  const topPick = rows
    .filter((p) => p.conf > TOP_PICK_MIN_WIN_PCT)
    .sort((a, b) => b.conf - a.conf)[0];

  // wave-392 KBO 대응(en 미러) — |netScore| ≥ MLB_FACTOR_PICK_STRONG(5) 인 경기, 최대 우세 순 top N.
  const factorPickGames = [...rows]
    .filter((g) => g.duelNetScore !== null && Math.abs(g.duelNetScore) >= MLB_FACTOR_PICK_STRONG)
    .sort((a, b) => Math.abs(b.duelNetScore!) - Math.abs(a.duelNetScore!))
    .slice(0, FACTOR_PICK_TOP_GAMES);

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      <Breadcrumb
        items={[{ label: 'MLB Analysis', href: '/en/mlb' }, { label: 'Analysis Hub' }]}
        locale="en"
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-brand-700 dark:text-brand-100">
          MLB AI Analysis Hub
        </h1>
        <p className="text-sm text-brand-500 mt-1">
          Today&apos;s big match · factor convergence picks · every AI prediction, all in one place.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-[var(--color-surface-card)]/50 p-6 space-y-3">
          <p className="text-brand-600 dark:text-brand-300">No MLB games today.</p>
          <Link
            href="/en/mlb"
            className="inline-flex items-center gap-1 rounded-lg border border-brand-300 dark:border-brand-700 px-3 py-1.5 text-sm hover:border-brand-500 transition-colors"
          >
            MLB Analysis hub
          </Link>
        </div>
      ) : (
        <>
          {topPick && (
            <section className="rounded-xl border border-brand-400 dark:border-brand-600 bg-brand-50 dark:bg-[var(--color-surface-card)]/50 p-5">
              <h2 className="text-lg font-bold text-brand-700 dark:text-brand-100 mb-2">
                ⭐ Today&apos;s Big Match
              </h2>
              <Link
                href={`/en/mlb/games/${today}/${topPick.homeCode}-vs-${topPick.awayCode}`}
                className="flex items-center justify-between"
              >
                <span className="font-semibold">{topPick.homeCode} vs {topPick.awayCode}</span>
                <span className="text-sm text-brand-600 dark:text-brand-300">
                  {topPick.winnerCode} {topPick.conf}%
                </span>
              </Link>
            </section>
          )}

          {factorPickGames.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-brand-700 dark:text-brand-100 mb-3">
                Factor Convergence Picks{factorPickGames.length > 1 ? ` (${factorPickGames.length} games)` : ''}
              </h2>
              <ul className="space-y-2">
                {factorPickGames.map((g) => {
                  const isComplete = Math.abs(g.duelNetScore!) >= MLB_FACTOR_PICK_COMPLETE;
                  const favoredCode = g.duelNetScore! > 0 ? g.homeCode : g.awayCode;
                  return (
                    <li
                      key={g.external_game_id}
                      className={`rounded-lg border p-3 ${
                        isComplete
                          ? 'border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/10'
                          : 'border-brand-200 dark:border-brand-800'
                      }`}
                    >
                      <Link
                        href={`/en/mlb/games/${today}/${g.homeCode}-vs-${g.awayCode}`}
                        className="flex items-center justify-between"
                      >
                        <span className="font-semibold">
                          {g.homeCode} vs {g.awayCode}
                        </span>
                        <span className={`text-xs font-medium ${isComplete ? 'text-amber-600 dark:text-amber-400' : 'text-brand-500'}`}>
                          {isComplete ? 'Full convergence' : 'Strong convergence'} · {favoredCode} {Math.abs(g.duelNetScore!)}/{g.duelValidCount}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-lg font-bold text-brand-700 dark:text-brand-100 mb-3">
              Today&apos;s Full Predictions ({rows.length} games)
            </h2>
            <ul className="space-y-3">
              {rows.map((p) => {
                const isTopPick = p.external_game_id === topPick?.external_game_id;
                return (
                  <li
                    key={p.external_game_id}
                    id={`pick-${p.external_game_id}`}
                    className={`rounded-lg border p-4 transition-colors ${
                      isTopPick
                        ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/30'
                        : 'border-brand-200 dark:border-brand-800 hover:border-brand-400'
                    }`}
                  >
                    <Link
                      href={`/en/mlb/games/${today}/${p.homeCode}-vs-${p.awayCode}`}
                      className="flex items-center justify-between"
                    >
                      <span className="font-semibold">
                        {isTopPick && <span className="mr-1.5" aria-label="Top confidence pick">⭐</span>}
                        {p.homeCode} vs {p.awayCode}
                      </span>
                      <span className="text-sm text-brand-600 dark:text-brand-300">
                        {p.winnerCode} {p.conf}%
                      </span>
                    </Link>
                    {p.status === 'scheduled' && (
                      <PickButton
                        gameId={p.external_game_id}
                        league="mlb"
                        locale="en"
                        homeTeam={p.homeCode}
                        awayTeam={p.awayCode}
                        aiPredictedWinner={p.winnerCode === p.homeCode ? 'home' : 'away'}
                        aiWinProb={p.homeWinProb}
                        analysisHref={`/en/mlb/games/${today}/${p.homeCode}-vs-${p.awayCode}`}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {weekRemainingByDate.size > 0 && (
        <section>
          <h2 className="text-lg font-bold text-brand-700 dark:text-brand-100 mb-3">
            📆 Remaining Games This Week ({weekRemainingGames.length} games)
          </h2>
          <div className="space-y-4">
            {Array.from(weekRemainingByDate.entries()).map(([date, games]) => (
              <div key={date}>
                <p className="text-xs font-medium text-brand-500 mb-1.5">{date}</p>
                <ul className="space-y-2">
                  {games.map((g) => {
                    const isComplete =
                      g.duelNetScore !== null && Math.abs(g.duelNetScore) >= MLB_FACTOR_PICK_COMPLETE;
                    const isStrong =
                      g.duelNetScore !== null && Math.abs(g.duelNetScore) >= MLB_FACTOR_PICK_STRONG;
                    const favoredCode =
                      g.duelNetScore !== null && g.duelNetScore > 0 ? g.homeCode : g.awayCode;
                    return (
                      <li
                        key={g.external_game_id}
                        className={`rounded-lg border p-3 ${
                          isComplete
                            ? 'border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/10'
                            : 'border-brand-200 dark:border-brand-800'
                        }`}
                      >
                        <Link
                          href={`/en/mlb/games/${date}/${g.homeCode}-vs-${g.awayCode}`}
                          className="flex items-center justify-between"
                        >
                          <span className="font-semibold">
                            {g.homeCode} vs {g.awayCode}
                          </span>
                          <span className="text-sm text-brand-600 dark:text-brand-300">
                            {isStrong ? (
                              <span
                                className={`text-xs font-medium mr-1.5 ${isComplete ? 'text-amber-600 dark:text-amber-400' : 'text-brand-500'}`}
                              >
                                {isComplete ? 'Full convergence' : 'Strong convergence'} · {favoredCode}
                              </span>
                            ) : null}
                            {g.winnerCode} {g.conf}%
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {teamStrengthRows.length > 0 && (
        <section aria-labelledby="mlb-team-strength-title-en">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <h2 id="mlb-team-strength-title-en" className="text-lg font-bold text-brand-700 dark:text-brand-100">
              📊 Team Strength Snapshot
            </h2>
            <Link href="/en/mlb/standings" className="text-sm text-brand-600 hover:underline">
              Standings →
            </Link>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Based on completed games — click a team name for the full profile.
          </p>
          <MlbTeamStrengthGrid rows={teamStrengthRows} locale="en" />
        </section>
      )}

      {yesterdayGames.length > 0 && (
        <section aria-labelledby="mlb-yesterday-title-en">
          <h2 id="mlb-yesterday-title-en" className="text-lg font-bold text-brand-700 dark:text-brand-100 mb-3">
            📅 Yesterday&apos;s Results ({yesterdayGames.length} games)
          </h2>
          <YesterdayStatusFilter
            locale="en"
            counts={{
              all: yesterdayGames.length,
              correct: yesterdayGames.filter((g) => g.isCorrect === true).length,
              wrong: yesterdayGames.filter((g) => g.isCorrect === false).length,
              pending: yesterdayGames.filter((g) => g.isCorrect == null).length,
            }}
          />
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {yesterdayGames.map((g) => {
              const status = g.isCorrect === true ? "correct" : g.isCorrect === false ? "wrong" : "pending";
              const winnerPct = Math.round(g.winnerProb * 100);
              return (
                <li key={g.external_game_id} data-yesterday-status={status}>
                  <Link
                    href={`/en/mlb/games/${g.gameDate}/${g.homeCode}-vs-${g.awayCode}`}
                    className="block rounded-lg border border-brand-200 dark:border-brand-800 p-3 hover:border-brand-400 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold truncate">
                        {g.awayName} {g.awayScore ?? "-"} : {g.homeScore ?? "-"} {g.homeName}
                      </span>
                      <span
                        className={`text-xs font-medium shrink-0 ${
                          status === "correct"
                            ? "text-brand-600 dark:text-brand-400"
                            : status === "wrong"
                              ? "text-red-500 dark:text-red-400"
                              : "text-brand-500"
                        }`}
                      >
                        {status === "correct" ? "✅ Correct" : status === "wrong" ? "❌ Missed" : "⏳ Pending"}
                      </span>
                    </div>
                    {g.predictedWinnerCode && (
                      <p className="text-xs text-brand-500 mt-1">
                        Predicted: {g.predictedWinnerCode} {winnerPct}%
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="mlb-weekly-review-title-en">
        <h2 id="mlb-weekly-review-title-en" className="sr-only">This Week&apos;s MLB Prediction Review</h2>
        <Link
          href={`/en/mlb/reviews/weekly/${currentWeek.weekId}`}
          className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 hover:border-brand-500 dark:hover:border-brand-500 transition-colors"
        >
          <div className="flex items-start gap-4">
            <span className="text-2xl shrink-0">📅</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                This Week&apos;s MLB Prediction Review →
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentWeek.label}
                {weeklyStats.total > 0
                  ? ` · ${weeklyStats.correct} correct of ${weeklyStats.total} games (${Math.round((weeklyStats.correct / weeklyStats.total) * 100)}%)`
                  : " · Waiting for verified games this week"}
              </p>
            </div>
          </div>
        </Link>
      </section>

      <section aria-labelledby="mlb-monthly-review-title-en">
        <h2 id="mlb-monthly-review-title-en" className="sr-only">This Month&apos;s MLB Prediction Review</h2>
        <Link
          href={`/en/mlb/reviews/monthly/${currentMonth.monthId}`}
          className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 hover:border-brand-500 dark:hover:border-brand-500 transition-colors"
        >
          <div className="flex items-start gap-4">
            <span className="text-2xl shrink-0">🗓️</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                This Month&apos;s MLB Prediction Review →
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentMonth.label}
                {monthlyStats.total > 0
                  ? ` · ${monthlyStats.correct} correct of ${monthlyStats.total} games (${Math.round((monthlyStats.correct / monthlyStats.total) * 100)}%)`
                  : " · Waiting for verified games this month"}
              </p>
            </div>
          </div>
        </Link>
      </section>

      <section aria-labelledby="mlb-accuracy-title-en">
        <h2 id="mlb-accuracy-title-en" className="sr-only">MLB AI Accuracy Track Record</h2>
        <Link
          href="/en/mlb/accuracy"
          className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 hover:border-brand-500 dark:hover:border-brand-500 transition-colors"
        >
          <div className="flex items-start gap-4">
            <span className="text-2xl shrink-0">🎯</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                MLB AI Accuracy Track Record →
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {accuracySummary.verifiedN > 0 && accuracySummary.accuracyRate != null
                  ? `${accuracySummary.correctN} correct of ${accuracySummary.verifiedN} verified this season (${Math.round(accuracySummary.accuracyRate * 100)}%)`
                  : "Waiting for verified games this season"}
                {" · calibration, team breakdowns, and factor analysis"}
              </p>
            </div>
          </div>
        </Link>
      </section>
    </main>
  );
}
