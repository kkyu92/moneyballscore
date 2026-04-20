import { createClient } from "@/lib/supabase/server";
import { KBO_TEAMS, type TeamCode, shortTeamName } from '@moneyball/shared';

export interface PitcherAppearance {
  gameId: number;
  gameDate: string;
  side: "home" | "away";
  opponentCode: TeamCode | null;
  opponentName: string | null;
  fip: number | null;
  xfip: number | null;
  predictedSideWin: boolean;
  isCorrect: boolean | null;
  status: string | null;
  ourScore: number | null;
  opponentScore: number | null;
}

export interface PitcherProfile {
  playerId: number;
  nameKo: string;
  nameEn: string | null;
  teamCode: TeamCode | null;
  teamName: string | null;
  teamColor: string | null;
  position: string | null;
  throws: string | null;
  appearances: number;
  avgFip: number | null;
  avgXFip: number | null;
  verifiedN: number;
  accuracyRate: number | null;
  recent: PitcherAppearance[];
}

interface PlayerRow {
  id: number;
  name_ko: string;
  name_en: string | null;
  position: string | null;
  throws: string | null;
  team: { code: string | null } | null;
}

interface AppearanceRow {
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_sp_xfip: number | null;
  away_sp_xfip: number | null;
  is_correct: boolean | null;
  predicted_winner: number | null;
  game: {
    id: number;
    game_date: string;
    status: string | null;
    home_score: number | null;
    away_score: number | null;
    home_sp_id: number | null;
    away_sp_id: number | null;
    home_team_id: number | null;
    away_team_id: number | null;
    home_team: { code: string | null } | null;
    away_team: { code: string | null } | null;
  } | null;
}

export async function buildPitcherProfile(
  playerId: number,
): Promise<PitcherProfile | null> {
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select(
      `
        id, name_ko, name_en, position, throws,
        team:teams!players_team_id_fkey(code)
      `,
    )
    .eq("id", playerId)
    .maybeSingle();

  if (!player) return null;

  const p = player as unknown as PlayerRow;
  const teamCode = (p.team?.code as TeamCode | null) ?? null;
  const teamInfo = teamCode ? KBO_TEAMS[teamCode] : null;

  const { data: preds } = await supabase
    .from("predictions")
    .select(
      `
        home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
        is_correct, predicted_winner,
        game:games!predictions_game_id_fkey(
          id, game_date, status, home_score, away_score,
          home_sp_id, away_sp_id, home_team_id, away_team_id,
          home_team:teams!games_home_team_id_fkey(code),
          away_team:teams!games_away_team_id_fkey(code)
        )
      `,
    )
    .eq("prediction_type", "pre_game");

  const rows = (preds ?? []) as unknown as AppearanceRow[];
  const appearances: PitcherAppearance[] = [];
  let fipSum = 0;
  let fipN = 0;
  let xfipSum = 0;
  let xfipN = 0;
  let verifiedN = 0;
  let correctN = 0;

  for (const r of rows) {
    const g = r.game;
    if (!g) continue;

    const isHome = g.home_sp_id === playerId;
    const isAway = g.away_sp_id === playerId;
    if (!isHome && !isAway) continue;

    const side: "home" | "away" = isHome ? "home" : "away";
    const fip = isHome ? r.home_sp_fip : r.away_sp_fip;
    const xfip = isHome ? r.home_sp_xfip : r.away_sp_xfip;

    if (fip != null) {
      fipSum += fip;
      fipN += 1;
    }
    if (xfip != null) {
      xfipSum += xfip;
      xfipN += 1;
    }

    const opponentCode = isHome
      ? (g.away_team?.code as TeamCode | null)
      : (g.home_team?.code as TeamCode | null);
    const opponentName = opponentCode
      ? (shortTeamName(opponentCode))
      : null;

    const ourTeamId = isHome ? g.home_team_id : g.away_team_id;
    const predictedSideWin =
      r.predicted_winner != null && r.predicted_winner === ourTeamId;

    if (r.is_correct != null) {
      verifiedN += 1;
      if (r.is_correct) correctN += 1;
    }

    appearances.push({
      gameId: g.id,
      gameDate: g.game_date,
      side,
      opponentCode,
      opponentName,
      fip,
      xfip,
      predictedSideWin,
      isCorrect: r.is_correct,
      status: g.status,
      ourScore: isHome ? g.home_score : g.away_score,
      opponentScore: isHome ? g.away_score : g.home_score,
    });
  }

  appearances.sort((a, b) => b.gameDate.localeCompare(a.gameDate));
  const recent = appearances.slice(0, 10);

  return {
    playerId: p.id,
    nameKo: p.name_ko,
    nameEn: p.name_en,
    teamCode,
    teamName: teamInfo?.name.split(" ")[0] ?? null,
    teamColor: teamInfo?.color ?? null,
    position: p.position,
    throws: p.throws,
    appearances: fipN,
    avgFip: fipN > 0 ? fipSum / fipN : null,
    avgXFip: xfipN > 0 ? xfipSum / xfipN : null,
    verifiedN,
    accuracyRate: verifiedN > 0 ? correctN / verifiedN : null,
    recent,
  };
}
