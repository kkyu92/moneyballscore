import { createClient } from "@/lib/supabase/server";
import { assertSelectOk, type TeamCode } from "@moneyball/shared";

export type GameResult = "W" | "L" | "T";

export interface TeamRecentForm {
  results: GameResult[];
  wins: number;
  losses: number;
  ties: number;
  totalGames: number;
  winRate: number | null;
}

export const EMPTY_RECENT_FORM: TeamRecentForm = {
  results: [],
  wins: 0,
  losses: 0,
  ties: 0,
  totalGames: 0,
  winRate: null,
};

interface GameRow {
  status: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  winner_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
}

/**
 * 팀의 최근 N개 final 경기 W/L/T 시퀀스. 매치업 페이지에서 두 팀의
 * 시즌 평균 팩터(buildTeamFactorAverages) 와 별개로 현재 분위기 표시용.
 */
export async function buildTeamRecentForm(
  teamCode: TeamCode,
  limit = 5,
): Promise<TeamRecentForm> {
  const supabase = await createClient();

  const teamResult = await supabase
    .from("teams")
    .select("id")
    .eq("code", teamCode)
    .maybeSingle();
  const { data: teamRow } = assertSelectOk(
    teamResult,
    `buildTeamRecentForm teams ${teamCode}`,
  );
  const teamId = (teamRow as { id: number } | null)?.id ?? null;
  if (teamId == null) return EMPTY_RECENT_FORM;

  const gamesResult = await supabase
    .from("games")
    .select(
      "status, home_team_id, away_team_id, winner_team_id, home_score, away_score",
    )
    .eq("status", "final")
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order("game_date", { ascending: false })
    .limit(limit);

  const { data: gamesData } = assertSelectOk(
    gamesResult,
    `buildTeamRecentForm games ${teamCode}`,
  );

  const rows = (gamesData ?? []) as GameRow[];
  const results: GameResult[] = [];
  let wins = 0;
  let losses = 0;
  let ties = 0;

  for (const r of rows) {
    if (r.home_team_id == null || r.away_team_id == null) continue;
    const isHome = r.home_team_id === teamId;
    const isAway = r.away_team_id === teamId;
    if (!isHome && !isAway) continue;

    if (r.winner_team_id == null) {
      if (r.home_score != null && r.away_score != null && r.home_score === r.away_score) {
        results.push("T");
        ties += 1;
      }
      continue;
    }

    if (r.winner_team_id === teamId) {
      results.push("W");
      wins += 1;
    } else {
      results.push("L");
      losses += 1;
    }
  }

  const decided = wins + losses;
  return {
    results,
    wins,
    losses,
    ties,
    totalGames: results.length,
    winRate: decided > 0 ? wins / decided : null,
  };
}
