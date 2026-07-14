import { createClient } from "@/lib/supabase/server";
import {
  assertSelectOk,
  CURRENT_SCORING_RULE,
  KBO_TEAMS,
  MATCHUP_UPCOMING_LIMIT,
  toKSTDateString,
  type TeamCode,
} from "@moneyball/shared";
import type { MatchupPair } from "./canonicalPair";

export interface MatchupUpcomingGame {
  gameId: number;
  gameDate: string;
  gameTime: string | null;
  stadium: string | null;
  homeCode: TeamCode;
  awayCode: TeamCode;
  homeWinProb: number | null;
  confidence: number | null;
  predictedWinnerCode: TeamCode | null;
}

interface UpcomingRow {
  id: number;
  game_date: string;
  game_time: string | null;
  stadium: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_team: { code: string | null } | null;
  away_team: { code: string | null } | null;
  predictions: Array<{
    predicted_winner: number | null;
    predicted_winner_team: { code: string | null } | null;
    confidence: number | null;
    home_win_prob: number | null;
    prediction_type: string;
    scoring_rule: string | null;
  }>;
}

export async function buildMatchupUpcoming(
  pair: MatchupPair,
): Promise<MatchupUpcomingGame[]> {
  const supabase = await createClient();

  const [teamAResult, teamBResult] = await Promise.all([
    supabase.from("teams").select("id").eq("code", pair.codeA).maybeSingle(),
    supabase.from("teams").select("id").eq("code", pair.codeB).maybeSingle(),
  ]);
  const { data: tARow } = assertSelectOk(teamAResult, "buildMatchupUpcoming teamA");
  const { data: tBRow } = assertSelectOk(teamBResult, "buildMatchupUpcoming teamB");
  const teamAId = (tARow as { id: number } | null)?.id ?? null;
  const teamBId = (tBRow as { id: number } | null)?.id ?? null;
  if (teamAId == null || teamBId == null) return [];

  const todayKST = toKSTDateString();

  const gamesResult = await supabase
    .from("games")
    .select(
      `
        id, game_date, game_time, stadium,
        home_team_id, away_team_id,
        home_team:teams!games_home_team_id_fkey(code),
        away_team:teams!games_away_team_id_fkey(code),
        predictions!inner(
          predicted_winner, confidence, home_win_prob, prediction_type, scoring_rule,
          predicted_winner_team:teams!predictions_predicted_winner_fkey(code)
        )
      `,
    )
    .eq("status", "scheduled")
    .gte("game_date", todayKST)
    .or(
      `and(home_team_id.eq.${teamAId},away_team_id.eq.${teamBId}),and(home_team_id.eq.${teamBId},away_team_id.eq.${teamAId})`,
    )
    .eq("predictions.prediction_type", "pre_game")
    .eq("predictions.scoring_rule", CURRENT_SCORING_RULE)
    .order("game_date", { ascending: true })
    .order("game_time", { ascending: true })
    .limit(MATCHUP_UPCOMING_LIMIT);

  const { data } = assertSelectOk(gamesResult, "buildMatchupUpcoming games");
  const rows = (data ?? []) as unknown as UpcomingRow[];

  const result: MatchupUpcomingGame[] = [];
  for (const g of rows) {
    const pred = g.predictions?.[0];
    if (!pred) continue;

    const homeCode =
      g.home_team?.code && g.home_team.code in KBO_TEAMS
        ? (g.home_team.code as TeamCode)
        : null;
    const awayCode =
      g.away_team?.code && g.away_team.code in KBO_TEAMS
        ? (g.away_team.code as TeamCode)
        : null;
    if (!homeCode || !awayCode) continue;

    const predictedWinnerCode =
      pred.predicted_winner_team?.code &&
      pred.predicted_winner_team.code in KBO_TEAMS
        ? (pred.predicted_winner_team.code as TeamCode)
        : null;

    result.push({
      gameId: g.id,
      gameDate: g.game_date,
      gameTime: g.game_time,
      stadium: g.stadium,
      homeCode,
      awayCode,
      homeWinProb: pred.home_win_prob,
      confidence: pred.confidence,
      predictedWinnerCode,
    });
  }

  return result;
}
