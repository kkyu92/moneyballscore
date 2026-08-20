import type { Metadata } from "next";
import Link from "next/link";
import {
  SITE_URL,
  MLB_PRODUCTION_COHORT_RULES,
  MLB_FACTOR_PICK_STRONG,
  MLB_FACTOR_PICK_COMPLETE,
  MLB_COMPOSITE_DUEL_MIN_VALID,
  FACTOR_PICK_TOP_GAMES,
  normalizeMlbTeamCode,
  assertSelectOk,
  TOP_PICK_CONF_MIN,
  confToWinProb,
  type MlbTeamCode,
} from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { PickButton } from "@/components/picks/PickButton";
import { createClient } from "@/lib/supabase/server";
import { computeMlbCompositeDuel } from "@/lib/analysis/computeMlbCompositeDuel";
import { getCurrentWeek } from "@/lib/reviews/computeWeekRange";
import { getCurrentMonth } from "@/lib/reviews/computeMonthRange";
import {
  getMlbThisWeekRemainingGames,
  groupMlbGamesByDate,
  getMlbYesterdayResults,
  getMlbPeriodStats,
} from "./analysis-data";

export const revalidate = 1800; // MLB_LIVE_ISR_SECONDS (Next.js 16 Turbopack: literal required)

// KBO predictions/[date] 의 "최고 자신감 픽"(topPick) 과 동일 임계값 (wave-624 parity).
const TOP_PICK_MIN_WIN_PCT = Math.round(confToWinProb(TOP_PICK_CONF_MIN) * 100);

export const metadata: Metadata = {
  title: "MLB AI 분석 센터 — 오늘 전체 예측 + 빅매치 + 팩터 수렴 픽 | MoneyBall Score",
  description: "오늘 MLB 전체 경기 AI 분석을 한 곳에서 — 오늘의 빅매치, 팩터 수렴 픽, 오늘 전체 예측.",
  alternates: {
    canonical: `${SITE_URL}/mlb/analysis`,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "MoneyBall Score",
    title: "MLB AI 분석 센터",
    description: "오늘 MLB 전체 경기 AI 분석 — 빅매치, 팩터 수렴 픽, 오늘 전체 예측.",
    url: `${SITE_URL}/mlb/analysis`,
  },
  twitter: {
    card: "summary_large_image",
    title: "MLB AI 분석 센터",
    description: "오늘 MLB 전체 경기 AI 분석 — 빅매치, 팩터 수렴 픽, 오늘 전체 예측.",
  },
};

interface MlbAnalysisRow {
  external_game_id: string;
  homeCode: MlbTeamCode;
  awayCode: MlbTeamCode;
  status: string;
  homeWinProb: number;
  winnerCode: MlbTeamCode;
  conf: number;
  /** wave-390 KBO 대응 — 유효 팩터 ≥ MLB_COMPOSITE_DUEL_MIN_VALID(3) 아니면 null */
  duelNetScore: number | null;
  duelValidCount: number;
}

// MLB 예측은 game_id=NULL(migration 038) — games!inner 조인은 KBO 전용이라
// 항상 미스매치(silent 빈 목록, cycle 2114 fix-incident). predictions 를
// mlb_game_date 로 직접 조회 후 mlb_schedule 로 팀 코드 join
// (mlb/games/[date]/page.tsx 와 동일 2-step 패턴, silent drift family fix cycle 1168).
async function getTodayMlbAnalysisRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  date: string,
): Promise<MlbAnalysisRow[]> {
  const predResult = await supabase
    .from('predictions')
    .select(`
      external_game_id, home_win_prob,
      home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
      home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip,
      home_war_total, away_war_total
    `)
    .eq('league', 'mlb')
    .eq('prediction_type', 'pre_game')
    .in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)
    .eq('mlb_game_date', date)
    .order('external_game_id', { ascending: true });
  const { data: preds } = assertSelectOk(predResult, 'MlbAnalysis predictions');
  if (!preds || preds.length === 0) return [];

  const gameIds = preds.map((p) => p.external_game_id);
  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, home_team_code, away_team_code, status')
    .in('external_game_id', gameIds);
  const { data: schedules } = assertSelectOk(scheduleResult, 'MlbAnalysis schedule');
  const scheduleByGameId = new Map((schedules ?? []).map((s) => [s.external_game_id, s]));

  const rows: MlbAnalysisRow[] = [];
  for (const p of preds) {
    const schedule = scheduleByGameId.get(p.external_game_id);
    const homeCode = schedule ? normalizeMlbTeamCode(schedule.home_team_code) : undefined;
    const awayCode = schedule ? normalizeMlbTeamCode(schedule.away_team_code) : undefined;
    if (!homeCode || !awayCode) continue;
    const homeWinProb = p.home_win_prob ?? 0.5;

    // wave-390 KBO 대응 — MLB 6팩터(elo/recent_form/head_to_head/sfr 미구현 제외) composite duel.
    const duel = computeMlbCompositeDuel({
      homeCode,
      homeLineupWoba: p.home_lineup_woba,
      awayLineupWoba: p.away_lineup_woba,
      homeBullpenFip: p.home_bullpen_fip,
      awayBullpenFip: p.away_bullpen_fip,
      homeSPFip: p.home_sp_fip,
      awaySPFip: p.away_sp_fip,
      homeSPXfip: p.home_sp_xfip,
      awaySPXfip: p.away_sp_xfip,
      homeWar: p.home_war_total,
      awayWar: p.away_war_total,
    });
    const validEnough = duel.validCount >= MLB_COMPOSITE_DUEL_MIN_VALID;

    rows.push({
      external_game_id: p.external_game_id,
      homeCode,
      awayCode,
      status: schedule?.status ?? 'scheduled',
      homeWinProb,
      winnerCode: homeWinProb >= 0.5 ? homeCode : awayCode,
      conf: Math.round((homeWinProb >= 0.5 ? homeWinProb : 1 - homeWinProb) * 100),
      duelNetScore: validEnough ? duel.netScore : null,
      duelValidCount: duel.validCount,
    });
  }
  return rows;
}

export default async function MlbAnalysisPage() {
  const today = new Date().toISOString().slice(0, 10);
  const currentWeek = getCurrentWeek();
  const currentMonth = getCurrentMonth();
  const supabase = await createClient();
  const [rows, weekRemainingGames, yesterdayGames, weeklyStats, monthlyStats] = await Promise.all([
    getTodayMlbAnalysisRows(supabase, today),
    getMlbThisWeekRemainingGames(today),
    getMlbYesterdayResults(),
    getMlbPeriodStats(currentWeek.startDate, currentWeek.endDate),
    getMlbPeriodStats(currentMonth.startDate, currentMonth.endDate),
  ]);
  const weekRemainingByDate = groupMlbGamesByDate(weekRemainingGames);

  // wave-624 KBO 대응 — 최고 자신감 픽 = 오늘의 빅매치 (MLB 는 elo/recent_form 미구현이라
  // KBO selectBigMatch(rivalry/elo-closeness 휴리스틱)를 그대로 쓰면 데이터 부족으로
  // 무의미(전 경기 동점) — confidence 기반으로 대체, plan #28 Phase 1 스코프 결정).
  const topPick = rows
    .filter((p) => p.conf > TOP_PICK_MIN_WIN_PCT)
    .sort((a, b) => b.conf - a.conf)[0];

  // wave-392 KBO 대응 — |netScore| ≥ MLB_FACTOR_PICK_STRONG(5) 인 경기, 최대 우세 순 top N.
  const factorPickGames = [...rows]
    .filter((g) => g.duelNetScore !== null && Math.abs(g.duelNetScore) >= MLB_FACTOR_PICK_STRONG)
    .sort((a, b) => Math.abs(b.duelNetScore!) - Math.abs(a.duelNetScore!))
    .slice(0, FACTOR_PICK_TOP_GAMES);

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      <Breadcrumb items={[{ label: 'MLB 분석', href: '/mlb' }, { label: '분석 센터' }]} />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-brand-700 dark:text-brand-100">
          MLB AI 분석 센터
        </h1>
        <p className="text-sm text-brand-500 mt-1">
          오늘의 빅매치 · 팩터 수렴 픽 · 전체 AI 예측을 한 곳에서.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-[var(--color-surface-card)]/50 p-6 space-y-3">
          <p className="text-brand-600 dark:text-brand-300">오늘 MLB 경기가 없습니다.</p>
          <Link
            href="/mlb"
            className="inline-flex items-center gap-1 rounded-md border border-brand-300 dark:border-brand-700 px-3 py-1.5 text-sm hover:border-brand-500 transition-colors"
          >
            MLB 분석 hub
          </Link>
        </div>
      ) : (
        <>
          {topPick && (
            <section className="rounded-xl border border-brand-400 dark:border-brand-600 bg-brand-50 dark:bg-[var(--color-surface-card)]/50 p-5">
              <h2 className="text-lg font-bold text-brand-700 dark:text-brand-100 mb-2">
                ⭐ 오늘의 빅매치
              </h2>
              <Link
                href={`/mlb/games/${today}/${topPick.homeCode}-vs-${topPick.awayCode}`}
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
                팩터 수렴 픽{factorPickGames.length > 1 ? ` (${factorPickGames.length}경기)` : ''}
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
                        href={`/mlb/games/${today}/${g.homeCode}-vs-${g.awayCode}`}
                        className="flex items-center justify-between"
                      >
                        <span className="font-semibold">
                          {g.homeCode} vs {g.awayCode}
                        </span>
                        <span className={`text-xs font-medium ${isComplete ? 'text-amber-600 dark:text-amber-400' : 'text-brand-500'}`}>
                          {isComplete ? '완전수렴' : '강수렴'} · {favoredCode} {Math.abs(g.duelNetScore!)}/{g.duelValidCount}
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
              오늘 전체 예측 ({rows.length}경기)
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
                        ? 'border-brand-500 dark:border-brand-400 ring-1 ring-brand-400 dark:ring-brand-500'
                        : 'border-brand-200 dark:border-brand-800 hover:border-brand-400'
                    }`}
                  >
                    <Link
                      href={`/mlb/games/${today}/${p.homeCode}-vs-${p.awayCode}`}
                      className="flex items-center justify-between"
                    >
                      <span className="font-semibold">
                        {isTopPick && <span className="mr-1.5" aria-label="최고 자신감 픽">⭐</span>}
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
                        homeTeam={p.homeCode}
                        awayTeam={p.awayCode}
                        aiPredictedWinner={p.winnerCode === p.homeCode ? 'home' : 'away'}
                        aiWinProb={p.homeWinProb}
                        analysisHref={`/mlb/games/${today}/${p.homeCode}-vs-${p.awayCode}`}
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
            📆 이번 주 남은 경기 ({weekRemainingGames.length}경기)
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
                          href={`/mlb/games/${date}/${g.homeCode}-vs-${g.awayCode}`}
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
                                {isComplete ? '완전수렴' : '강수렴'} · {favoredCode}
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

      {yesterdayGames.length > 0 && (
        <section aria-labelledby="mlb-yesterday-title">
          <h2 id="mlb-yesterday-title" className="text-lg font-bold text-brand-700 dark:text-brand-100 mb-3">
            📅 어제 결과 ({yesterdayGames.length}경기)
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {yesterdayGames.map((g) => {
              const status = g.isCorrect === true ? "correct" : g.isCorrect === false ? "wrong" : "pending";
              const winnerPct = Math.round(g.winnerProb * 100);
              return (
                <li key={g.external_game_id} data-yesterday-status={status}>
                  <Link
                    href={`/mlb/games/${g.gameDate}/${g.homeCode}-vs-${g.awayCode}`}
                    className="block rounded-lg border border-brand-200 dark:border-brand-800 p-3 hover:border-brand-400 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold truncate">
                        {g.awayName} {g.awayScore ?? "-"} : {g.homeScore ?? "-"} {g.homeName}
                      </span>
                      <span
                        className={`text-xs font-medium shrink-0 ${
                          status === "correct"
                            ? "text-green-600 dark:text-green-400"
                            : status === "wrong"
                              ? "text-red-500 dark:text-red-400"
                              : "text-brand-500"
                        }`}
                      >
                        {status === "correct" ? "✅ 적중" : status === "wrong" ? "❌ 실패" : "⏳ 대기"}
                      </span>
                    </div>
                    {g.predictedWinnerCode && (
                      <p className="text-xs text-brand-500 mt-1">
                        예측: {g.predictedWinnerCode} {winnerPct}%
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="mlb-weekly-review-title">
        <h2 id="mlb-weekly-review-title" className="sr-only">이번 주 MLB 예측 리뷰</h2>
        <Link
          href={`/mlb/reviews/weekly/${currentWeek.weekId}`}
          className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 hover:border-brand-500 dark:hover:border-brand-500 transition-colors"
        >
          <div className="flex items-start gap-4">
            <span className="text-2xl shrink-0">📅</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                이번 주 MLB 예측 리뷰 →
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentWeek.label}
                {weeklyStats.total > 0
                  ? ` · ${weeklyStats.total}경기 중 ${weeklyStats.correct}적중 (${Math.round((weeklyStats.correct / weeklyStats.total) * 100)}%)`
                  : " · 이번 주 검증된 경기를 기다리는 중"}
              </p>
            </div>
          </div>
        </Link>
      </section>

      <section aria-labelledby="mlb-monthly-review-title">
        <h2 id="mlb-monthly-review-title" className="sr-only">이번 달 MLB 예측 리뷰</h2>
        <Link
          href={`/mlb/reviews/monthly/${currentMonth.monthId}`}
          className="block bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5 hover:border-brand-500 dark:hover:border-brand-500 transition-colors"
        >
          <div className="flex items-start gap-4">
            <span className="text-2xl shrink-0">🗓️</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                이번 달 MLB 예측 리뷰 →
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentMonth.label}
                {monthlyStats.total > 0
                  ? ` · ${monthlyStats.total}경기 중 ${monthlyStats.correct}적중 (${Math.round((monthlyStats.correct / monthlyStats.total) * 100)}%)`
                  : " · 이번 달 검증된 경기를 기다리는 중"}
              </p>
            </div>
          </div>
        </Link>
      </section>
    </main>
  );
}
