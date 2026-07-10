/**
 * HistoricalAnalogMatchup — 같은 두 팀 (home, away) 과거 대결 3건 자동 매핑.
 *
 * analysis/game/[id] 안 section.
 *
 * source: games + predictions inner join, status='final', CURRENT_SCORING_RULE filter,
 * (home_team_id IN [home, away] AND away_team_id IN [home, away]), 본 게임 제외,
 * order by date desc limit 3.
 *
 * Server Component. 결과 display = 날짜 / matchup / 우리 모델 예측 / 실제 결과
 * / 적중 여부 row.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { shortTeamName, type TeamCode, CURRENT_SCORING_RULE } from "@moneyball/shared";

interface AnalogRow {
  gameId: number;
  gameDate: string;
  homeCode: TeamCode;
  awayCode: TeamCode;
  homeScore: number | null;
  awayScore: number | null;
  predictedWinnerCode: TeamCode | null;
  actualWinnerCode: TeamCode | null;
  isCorrect: boolean | null;
}

interface QueryRow {
  id: number;
  game_date: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { code: string } | null;
  away_team: { code: string } | null;
  winner: { code: string } | null;
  predictions:
    | {
        is_correct: boolean | null;
        scoring_rule: string;
        winner: { code: string } | null;
      }[]
    | null;
}

function createPublicClient() {
  // RLS public — anon key
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function fetchHistoricalAnalogs(
  homeTeamId: number,
  awayTeamId: number,
  currentGameId: number,
  asOfDate: string,
  limit = 3,
): Promise<AnalogRow[]> {
  try {
    const supabase = createPublicClient();
    // 같은 두 팀 (home/away 순서 무관) 과거 final game. 본 게임 제외.
    const teamIds = [homeTeamId, awayTeamId];
    const { data, error } = await supabase
      .from("games")
      .select(
        `id, game_date, home_score, away_score,
         home_team:teams!games_home_team_id_fkey(code),
         away_team:teams!games_away_team_id_fkey(code),
         winner:teams!games_winner_team_id_fkey(code),
         predictions!inner(is_correct, scoring_rule, winner:teams!predictions_predicted_winner_fkey(code))`,
      )
      .in("home_team_id", teamIds)
      .in("away_team_id", teamIds)
      .eq("status", "final")
      .lt("game_date", asOfDate)
      .neq("id", currentGameId)
      .eq("predictions.prediction_type", "pre_game")
      .eq("predictions.scoring_rule", CURRENT_SCORING_RULE)
      .order("game_date", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[HistoricalAnalogMatchup] fetch failed:", error.message);
      Sentry.captureException(new Error(error.message), {
        tags: { silent_drift_family: 'wave_173', component: 'HistoricalAnalogMatchup', op: 'fetchHistoricalAnalogs.query' },
      });
      return [];
    }
    if (!data) return [];

    return (data as unknown as QueryRow[])
      .filter((row) => row.home_team?.code && row.away_team?.code)
      .map((row) => ({
        gameId: row.id,
        gameDate: row.game_date,
        homeCode: row.home_team!.code as TeamCode,
        awayCode: row.away_team!.code as TeamCode,
        homeScore: row.home_score,
        awayScore: row.away_score,
        predictedWinnerCode: (row.predictions?.[0]?.winner?.code ?? null) as TeamCode | null,
        actualWinnerCode: (row.winner?.code ?? null) as TeamCode | null,
        isCorrect: row.predictions?.[0]?.is_correct ?? null,
      }));
  } catch (err) {
    console.warn("[HistoricalAnalogMatchup] query exception:", err);
    Sentry.captureException(err, {
      tags: { silent_drift_family: 'wave_173', component: 'HistoricalAnalogMatchup', op: 'fetchHistoricalAnalogs.exception' },
    });
    return [];
  }
}

interface Props {
  homeTeam: TeamCode;
  awayTeam: TeamCode;
  homeTeamId: number;
  awayTeamId: number;
  gameId: number;
  asOfDate: string;
}

export async function HistoricalAnalogMatchup({
  homeTeam,
  awayTeam,
  homeTeamId,
  awayTeamId,
  gameId,
  asOfDate,
}: Props) {
  const analogs = await fetchHistoricalAnalogs(homeTeamId, awayTeamId, gameId, asOfDate, 3);

  if (analogs.length === 0) return null;

  const homeName = shortTeamName(homeTeam);
  const awayName = shortTeamName(awayTeam);

  return (
    <section
      aria-labelledby="historical-analog-heading"
      className="rounded-2xl border border-brand-200 dark:border-brand-800 bg-white dark:bg-brand-950 p-4 md:p-6"
    >
      <header className="mb-3">
        <h2
          id="historical-analog-heading"
          className="text-lg md:text-xl font-bold text-brand-700 dark:text-brand-100"
        >
          최근 같은 대결 ({awayName} vs {homeName})
        </h2>
        <p className="text-xs md:text-sm text-brand-500 dark:text-brand-400 mt-1">
          최근 {analogs.length}경기 — 우리 모델 예측 vs 실제 결과 비교
        </p>
      </header>
      <div className="space-y-2">
        {analogs.map((a) => {
          const isCorrect = a.isCorrect === true;
          const isWrong = a.isCorrect === false;
          const scoreText =
            a.homeScore != null && a.awayScore != null
              ? `${a.awayScore}-${a.homeScore}`
              : "?";
          return (
            <Link
              key={a.gameId}
              href={`/analysis/game/${a.gameId}`}
              className="block rounded-lg border border-brand-100 dark:border-brand-900 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/40 transition-colors p-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-brand-500 dark:text-brand-400 w-20">
                    {a.gameDate}
                  </span>
                  <span className="text-sm font-semibold text-brand-700 dark:text-brand-200">
                    {shortTeamName(a.awayCode)} @ {shortTeamName(a.homeCode)}
                  </span>
                  <span className="text-sm font-mono text-brand-600 dark:text-brand-300">
                    {scoreText}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-brand-500 dark:text-brand-400">예측:</span>
                  <span className="font-mono font-semibold text-brand-700 dark:text-brand-200">
                    {a.predictedWinnerCode ?? "?"}
                  </span>
                  {a.actualWinnerCode && (
                    <>
                      <span className="text-brand-400 dark:text-brand-500">→</span>
                      <span className="font-mono text-brand-600 dark:text-brand-300">
                        실제 {a.actualWinnerCode}
                      </span>
                    </>
                  )}
                  {isCorrect && (
                    <span className="rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-200 px-2 py-0.5 font-semibold">
                      적중
                    </span>
                  )}
                  {isWrong && (
                    <span className="rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 font-semibold">
                      오답
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
