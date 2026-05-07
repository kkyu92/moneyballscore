import { createClient } from "@/lib/supabase/server";
import { assertSelectOk, type TeamCode } from "@moneyball/shared";

export interface TeamAccuracyRow {
  teamCode: TeamCode;
  verifiedN: number;
  correctN: number;
  accuracyRate: number | null;
}

interface PredRow {
  is_correct: boolean | null;
  game: {
    home_team: { code: string | null } | null;
    away_team: { code: string | null } | null;
  } | null;
}

export async function buildAllTeamAccuracy(): Promise<TeamAccuracyRow[]> {
  const supabase = await createClient();

  const result = await supabase
    .from("predictions")
    .select(
      `
      is_correct,
      game:games!predictions_game_id_fkey(
        home_team:teams!games_home_team_id_fkey(code),
        away_team:teams!games_away_team_id_fkey(code)
      )
    `,
    )
    .eq("prediction_type", "pre_game")
    .not("is_correct", "is", null);

  const { data } = assertSelectOk(result, "buildAllTeamAccuracy");
  if (!data || data.length === 0) return [];

  const rows = data as unknown as PredRow[];
  const acc = new Map<string, { verifiedN: number; correctN: number }>();

  for (const row of rows) {
    const homeCode = row.game?.home_team?.code;
    const awayCode = row.game?.away_team?.code;
    for (const code of [homeCode, awayCode]) {
      if (!code) continue;
      if (!acc.has(code)) acc.set(code, { verifiedN: 0, correctN: 0 });
      const entry = acc.get(code)!;
      entry.verifiedN += 1;
      if (row.is_correct) entry.correctN += 1;
    }
  }

  return Array.from(acc.entries())
    .map(([code, { verifiedN, correctN }]) => ({
      teamCode: code as TeamCode,
      verifiedN,
      correctN,
      accuracyRate: verifiedN > 0 ? correctN / verifiedN : null,
    }))
    .sort((a, b) => (b.accuracyRate ?? -1) - (a.accuracyRate ?? -1));
}
