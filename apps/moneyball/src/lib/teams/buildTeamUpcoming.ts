import { createClient } from "@/lib/supabase/server";
import {
  KBO_TEAMS,
  type TeamCode,
  shortTeamName,
  assertSelectOk,
  CURRENT_SCORING_RULE,
  TEAM_UPCOMING_LIMIT,
  toKSTDateString,
} from "@moneyball/shared";

export interface TeamUpcomingGame {
  gameId: number;
  gameDate: string;
  gameTime: string | null;
  stadium: string | null;
  isHome: boolean;
  opponentCode: TeamCode | null;
  opponentName: string;
  predictedAsWinner: boolean;
  homeWinProb: number | null;
  confidence: number | null;
}

interface UpcomingGameRow {
  id: number;
  game_date: string;
  game_time: string | null;
  stadium: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_team: { id: number; code: string | null; name_ko: string | null } | null;
  away_team: { id: number; code: string | null; name_ko: string | null } | null;
  predictions: Array<{
    predicted_winner: number | null;
    confidence: number | null;
    home_win_prob: number | null;
    prediction_type: string;
    scoring_rule: string | null;
  }>;
}

export async function buildTeamUpcoming(
  teamCode: TeamCode,
): Promise<TeamUpcomingGame[]> {
  const supabase = await createClient();

  const teamResult = await supabase
    .from("teams")
    .select("id")
    .eq("code", teamCode)
    .maybeSingle();
  const { data: teamRow } = assertSelectOk(teamResult, "buildTeamUpcoming teams");
  const teamId = (teamRow as { id: number } | null)?.id ?? null;
  if (teamId == null) return [];

  const todayKST = toKSTDateString();

  const gamesResult = await supabase
    .from("games")
    .select(
      `
        id, game_date, game_time, stadium,
        home_team_id, away_team_id,
        home_team:teams!games_home_team_id_fkey(id, code, name_ko),
        away_team:teams!games_away_team_id_fkey(id, code, name_ko),
        predictions!inner(
          predicted_winner, confidence, home_win_prob,
          prediction_type, scoring_rule
        )
      `,
    )
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq("status", "scheduled")
    .gte("game_date", todayKST)
    .eq("predictions.prediction_type", "pre_game")
    .eq("predictions.scoring_rule", CURRENT_SCORING_RULE)
    .order("game_date", { ascending: true })
    .order("game_time", { ascending: true })
    .limit(TEAM_UPCOMING_LIMIT);

  const { data } = assertSelectOk(gamesResult, "buildTeamUpcoming games");
  const rows = (data ?? []) as unknown as UpcomingGameRow[];

  const result: TeamUpcomingGame[] = [];
  for (const g of rows) {
    const pred = g.predictions?.[0];
    if (!pred) continue;

    const isHome = g.home_team_id === teamId;
    const opponent = isHome ? g.away_team : g.home_team;
    const opponentCode =
      opponent?.code && opponent.code in KBO_TEAMS
        ? (opponent.code as TeamCode)
        : null;
    const opponentName = opponentCode
      ? shortTeamName(opponentCode)
      : (opponent?.name_ko ?? "-");

    result.push({
      gameId: g.id,
      gameDate: g.game_date,
      gameTime: g.game_time,
      stadium: g.stadium,
      isHome,
      opponentCode,
      opponentName,
      predictedAsWinner: pred.predicted_winner === teamId,
      homeWinProb: pred.home_win_prob,
      confidence: pred.confidence,
    });
  }

  return result;
}
