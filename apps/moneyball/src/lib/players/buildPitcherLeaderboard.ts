import { createClient } from "@/lib/supabase/server";
import { KBO_TEAMS, type TeamCode } from "@moneyball/shared";

export interface PitcherLeaderboardRow {
  playerId: number;
  nameKo: string;
  teamCode: TeamCode | null;
  teamName: string | null;
  teamColor: string | null;
  appearances: number;
  avgFip: number;
  avgXFip: number | null;
  predictedWinRate: number | null;
  verifiedN: number;
  accuracyRate: number | null;
}

interface Row {
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_sp_xfip: number | null;
  away_sp_xfip: number | null;
  is_correct: boolean | null;
  confidence: number | null;
  predicted_winner: number | null;
  game: {
    home_sp_id: number | null;
    away_sp_id: number | null;
    home_team_id: number | null;
    away_team_id: number | null;
    status: string | null;
    home_sp: { id: number; name_ko: string; team_id: number | null } | null;
    away_sp: { id: number; name_ko: string; team_id: number | null } | null;
    home_team: { id: number; code: string } | null;
    away_team: { id: number; code: string } | null;
  } | null;
}

interface Accumulator {
  playerId: number;
  nameKo: string;
  teamCode: TeamCode | null;
  fipSum: number;
  fipN: number;
  xfipSum: number;
  xfipN: number;
  predictedWin: number;
  verifiedN: number;
  correctN: number;
}

function addPitcherObservation(
  acc: Map<number, Accumulator>,
  player: { id: number; name_ko: string } | null,
  teamCode: TeamCode | null,
  fip: number | null,
  xfip: number | null,
  isThisPitcherSideWin: boolean,
  isCorrect: boolean | null,
) {
  if (!player) return;
  if (fip == null) return;

  const existing: Accumulator = acc.get(player.id) ?? {
    playerId: player.id,
    nameKo: player.name_ko,
    teamCode,
    fipSum: 0,
    fipN: 0,
    xfipSum: 0,
    xfipN: 0,
    predictedWin: 0,
    verifiedN: 0,
    correctN: 0,
  };
  existing.fipSum += fip;
  existing.fipN += 1;
  if (xfip != null) {
    existing.xfipSum += xfip;
    existing.xfipN += 1;
  }
  if (isThisPitcherSideWin) existing.predictedWin += 1;
  if (isCorrect != null) {
    existing.verifiedN += 1;
    if (isCorrect) existing.correctN += 1;
  }
  acc.set(player.id, existing);
}

/**
 * 선발 투수별 집계.
 * predictions + games 조인으로 home_sp / away_sp 각각을 한 번의 등판으로 취급.
 * FIP 낮은 순 Top N 반환.
 */
export async function buildPitcherLeaderboard(options: {
  limit?: number;
  minAppearances?: number;
} = {}): Promise<PitcherLeaderboardRow[]> {
  const limit = options.limit ?? 10;
  const minAppearances = options.minAppearances ?? 1;

  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select(
      `
        home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
        is_correct, confidence, predicted_winner,
        game:games!predictions_game_id_fkey(
          home_sp_id, away_sp_id, home_team_id, away_team_id, status,
          home_sp:players!games_home_sp_id_fkey(id, name_ko, team_id),
          away_sp:players!games_away_sp_id_fkey(id, name_ko, team_id),
          home_team:teams!games_home_team_id_fkey(id, code),
          away_team:teams!games_away_team_id_fkey(id, code)
        )
      `,
    )
    .eq("prediction_type", "pre_game");

  const rows = (data ?? []) as unknown as Row[];
  const acc = new Map<number, Accumulator>();

  for (const r of rows) {
    const g = r.game;
    if (!g) continue;

    const homeTeamCode = (g.home_team?.code as TeamCode | undefined) ?? null;
    const awayTeamCode = (g.away_team?.code as TeamCode | undefined) ?? null;
    const predictedHomeWin =
      r.predicted_winner != null && r.predicted_winner === g.home_team_id;
    const predictedAwayWin =
      r.predicted_winner != null && r.predicted_winner === g.away_team_id;

    addPitcherObservation(
      acc,
      g.home_sp,
      homeTeamCode,
      r.home_sp_fip,
      r.home_sp_xfip,
      predictedHomeWin,
      r.is_correct,
    );
    addPitcherObservation(
      acc,
      g.away_sp,
      awayTeamCode,
      r.away_sp_fip,
      r.away_sp_xfip,
      predictedAwayWin,
      r.is_correct,
    );
  }

  const result: PitcherLeaderboardRow[] = Array.from(acc.values())
    .filter((a) => a.fipN >= minAppearances)
    .map((a) => {
      const team = a.teamCode ? KBO_TEAMS[a.teamCode] : null;
      return {
        playerId: a.playerId,
        nameKo: a.nameKo,
        teamCode: a.teamCode,
        teamName: team?.name.split(" ")[0] ?? null,
        teamColor: team?.color ?? null,
        appearances: a.fipN,
        avgFip: a.fipSum / a.fipN,
        avgXFip: a.xfipN > 0 ? a.xfipSum / a.xfipN : null,
        predictedWinRate: a.fipN > 0 ? a.predictedWin / a.fipN : null,
        verifiedN: a.verifiedN,
        accuracyRate: a.verifiedN > 0 ? a.correctN / a.verifiedN : null,
      };
    })
    .sort((a, b) => {
      if (a.avgFip !== b.avgFip) return a.avgFip - b.avgFip;
      return b.appearances - a.appearances;
    })
    .slice(0, limit);

  return result;
}
