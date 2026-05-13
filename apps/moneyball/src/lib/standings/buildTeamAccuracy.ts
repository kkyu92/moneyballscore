import { createClient } from "@/lib/supabase/server";
import { assertSelectOk, type TeamCode } from "@moneyball/shared";
import { CURRENT_MODEL_FILTER } from "@/config/model";

export interface TeamAccuracyRow {
  teamCode: TeamCode;
  verifiedN: number;
  correctN: number;
  accuracyRate: number | null;
}

export interface MatchupRow {
  teamCode: TeamCode;
  opponentCode: TeamCode;
  n: number;
  correct: number;
  accuracyRate: number | null;
}

export interface TeamHomeAwayRow {
  teamCode: TeamCode;
  homeN: number;
  homeCorrect: number;
  homeAccuracy: number | null;
  awayN: number;
  awayCorrect: number;
  awayAccuracy: number | null;
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
    .match(CURRENT_MODEL_FILTER)
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

export async function buildMatchupData(): Promise<{
  matchups: MatchupRow[];
  homeAway: TeamHomeAwayRow[];
}> {
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
    .match(CURRENT_MODEL_FILTER)
    .eq("prediction_type", "pre_game")
    .not("is_correct", "is", null);

  const { data } = assertSelectOk(result, "buildMatchupData");
  if (!data || data.length === 0) return { matchups: [], homeAway: [] };

  const rows = data as unknown as PredRow[];

  // matchup[teamCode][opponentCode] = {n, correct}
  const matchupMap = new Map<string, Map<string, { n: number; correct: number }>>();
  // homeAway[teamCode] = {homeN, homeCorrect, awayN, awayCorrect}
  const haMap = new Map<string, { homeN: number; homeCorrect: number; awayN: number; awayCorrect: number }>();

  for (const row of rows) {
    const homeCode = row.game?.home_team?.code;
    const awayCode = row.game?.away_team?.code;
    if (!homeCode || !awayCode) continue;
    const hit = row.is_correct === true;

    // home/away split
    for (const [code, isHome] of [[homeCode, true], [awayCode, false]] as [string, boolean][]) {
      if (!haMap.has(code)) haMap.set(code, { homeN: 0, homeCorrect: 0, awayN: 0, awayCorrect: 0 });
      const ha = haMap.get(code)!;
      if (isHome) { ha.homeN++; if (hit) ha.homeCorrect++; }
      else { ha.awayN++; if (hit) ha.awayCorrect++; }
    }

    // matchup (bidirectional: home sees away as opponent, away sees home as opponent)
    for (const [team, opp] of [[homeCode, awayCode], [awayCode, homeCode]] as [string, string][]) {
      if (!matchupMap.has(team)) matchupMap.set(team, new Map());
      const oppMap = matchupMap.get(team)!;
      if (!oppMap.has(opp)) oppMap.set(opp, { n: 0, correct: 0 });
      const entry = oppMap.get(opp)!;
      entry.n++;
      if (hit) entry.correct++;
    }
  }

  const matchups: MatchupRow[] = [];
  for (const [team, oppMap] of matchupMap.entries()) {
    for (const [opp, { n, correct }] of oppMap.entries()) {
      matchups.push({
        teamCode: team as TeamCode,
        opponentCode: opp as TeamCode,
        n,
        correct,
        accuracyRate: n > 0 ? correct / n : null,
      });
    }
  }

  const homeAway: TeamHomeAwayRow[] = Array.from(haMap.entries()).map(
    ([code, { homeN, homeCorrect, awayN, awayCorrect }]) => ({
      teamCode: code as TeamCode,
      homeN,
      homeCorrect,
      homeAccuracy: homeN > 0 ? homeCorrect / homeN : null,
      awayN,
      awayCorrect,
      awayAccuracy: awayN > 0 ? awayCorrect / awayN : null,
    }),
  );

  return { matchups, homeAway };
}
