import { createClient } from "@/lib/supabase/server";
import { KBO_TEAMS, type TeamCode } from "@moneyball/shared";

export interface TeamPitcherRow {
  playerId: number;
  nameKo: string;
  appearances: number;
  avgFip: number | null;
}

export interface TeamRecentGame {
  gameId: number;
  gameDate: string;
  isHome: boolean;
  opponentCode: TeamCode | null;
  opponentName: string | null;
  predictedAsWinner: boolean;
  confidence: number | null;
  isCorrect: boolean | null;
  ourScore: number | null;
  opponentScore: number | null;
  status: string | null;
}

export interface TeamFactorAverages {
  spFip: number | null;
  lineupWoba: number | null;
  bullpenFip: number | null;
  recentForm: number | null;
  elo: number | null;
}

export interface TeamProfile {
  code: TeamCode;
  name: string;
  shortName: string;
  stadium: string;
  color: string;
  parkPf: number;
  parkNote: string;
  predictedGames: number;
  predictedWins: number;
  predictedWinRate: number | null;
  verifiedN: number;
  correctN: number;
  accuracyRate: number | null;
  factorAverages: TeamFactorAverages;
  topPitchers: TeamPitcherRow[];
  recentGames: TeamRecentGame[];
}

interface PredRow {
  confidence: number | null;
  is_correct: boolean | null;
  predicted_winner: number | null;
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_lineup_woba: number | null;
  away_lineup_woba: number | null;
  home_bullpen_fip: number | null;
  away_bullpen_fip: number | null;
  home_recent_form: number | null;
  away_recent_form: number | null;
  home_elo: number | null;
  away_elo: number | null;
  game: {
    id: number;
    game_date: string;
    status: string | null;
    home_score: number | null;
    away_score: number | null;
    home_team_id: number | null;
    away_team_id: number | null;
    home_sp_id: number | null;
    away_sp_id: number | null;
    home_sp: { id: number; name_ko: string } | null;
    away_sp: { id: number; name_ko: string } | null;
    home_team: { code: string | null } | null;
    away_team: { code: string | null } | null;
  } | null;
}

function safeAvg(sum: number, n: number): number | null {
  return n > 0 ? sum / n : null;
}

export async function buildTeamProfile(
  teamCode: TeamCode,
): Promise<TeamProfile | null> {
  const meta = KBO_TEAMS[teamCode];
  if (!meta) return null;

  const supabase = await createClient();

  const { data: teamRow } = await supabase
    .from("teams")
    .select("id")
    .eq("code", teamCode)
    .maybeSingle();

  const teamId = (teamRow as { id: number } | null)?.id ?? null;
  if (teamId == null) {
    // Team record 없어도 빈 프로필 반환 (KBO_TEAMS 메타는 있으므로)
    return {
      code: teamCode,
      name: meta.name,
      shortName: meta.name.split(" ")[0],
      stadium: meta.stadium,
      color: meta.color,
      parkPf: meta.parkPf,
      parkNote: meta.parkNote,
      predictedGames: 0,
      predictedWins: 0,
      predictedWinRate: null,
      verifiedN: 0,
      correctN: 0,
      accuracyRate: null,
      factorAverages: {
        spFip: null,
        lineupWoba: null,
        bullpenFip: null,
        recentForm: null,
        elo: null,
      },
      topPitchers: [],
      recentGames: [],
    };
  }

  const { data } = await supabase
    .from("predictions")
    .select(
      `
        confidence, is_correct, predicted_winner,
        home_sp_fip, away_sp_fip,
        home_lineup_woba, away_lineup_woba,
        home_bullpen_fip, away_bullpen_fip,
        home_recent_form, away_recent_form,
        home_elo, away_elo,
        game:games!predictions_game_id_fkey(
          id, game_date, status, home_score, away_score,
          home_team_id, away_team_id, home_sp_id, away_sp_id,
          home_sp:players!games_home_sp_id_fkey(id, name_ko),
          away_sp:players!games_away_sp_id_fkey(id, name_ko),
          home_team:teams!games_home_team_id_fkey(code),
          away_team:teams!games_away_team_id_fkey(code)
        )
      `,
    )
    .eq("prediction_type", "pre_game");

  const rows = (data ?? []) as unknown as PredRow[];

  let predictedGames = 0;
  let predictedWins = 0;
  let verifiedN = 0;
  let correctN = 0;

  let spFipSum = 0;
  let spFipN = 0;
  let wobaSum = 0;
  let wobaN = 0;
  let bullpenSum = 0;
  let bullpenN = 0;
  let formSum = 0;
  let formN = 0;
  let eloSum = 0;
  let eloN = 0;

  const pitcherAcc = new Map<
    number,
    { name: string; fipSum: number; fipN: number }
  >();
  const teamGames: TeamRecentGame[] = [];

  for (const r of rows) {
    const g = r.game;
    if (!g) continue;

    const isHome = g.home_team_id === teamId;
    const isAway = g.away_team_id === teamId;
    if (!isHome && !isAway) continue;

    predictedGames += 1;

    const spFip = isHome ? r.home_sp_fip : r.away_sp_fip;
    const woba = isHome ? r.home_lineup_woba : r.away_lineup_woba;
    const bullpen = isHome ? r.home_bullpen_fip : r.away_bullpen_fip;
    const form = isHome ? r.home_recent_form : r.away_recent_form;
    const elo = isHome ? r.home_elo : r.away_elo;

    if (spFip != null) {
      spFipSum += spFip;
      spFipN += 1;
    }
    if (woba != null) {
      wobaSum += woba;
      wobaN += 1;
    }
    if (bullpen != null) {
      bullpenSum += bullpen;
      bullpenN += 1;
    }
    if (form != null) {
      formSum += form;
      formN += 1;
    }
    if (elo != null) {
      eloSum += elo;
      eloN += 1;
    }

    const predictedThisTeam =
      r.predicted_winner != null && r.predicted_winner === teamId;
    if (predictedThisTeam) predictedWins += 1;

    if (r.is_correct != null) {
      verifiedN += 1;
      if (r.is_correct) correctN += 1;
    }

    // 해당 팀의 선발 투수 집계
    const teamSp = isHome ? g.home_sp : g.away_sp;
    if (teamSp && spFip != null) {
      const existing = pitcherAcc.get(teamSp.id) ?? {
        name: teamSp.name_ko,
        fipSum: 0,
        fipN: 0,
      };
      existing.fipSum += spFip;
      existing.fipN += 1;
      pitcherAcc.set(teamSp.id, existing);
    }

    const opponentCode = isHome
      ? (g.away_team?.code as TeamCode | null)
      : (g.home_team?.code as TeamCode | null);

    teamGames.push({
      gameId: g.id,
      gameDate: g.game_date,
      isHome,
      opponentCode,
      opponentName: opponentCode
        ? (KBO_TEAMS[opponentCode]?.name.split(" ")[0] ?? null)
        : null,
      predictedAsWinner: predictedThisTeam,
      confidence: r.confidence,
      isCorrect: r.is_correct,
      ourScore: isHome ? g.home_score : g.away_score,
      opponentScore: isHome ? g.away_score : g.home_score,
      status: g.status,
    });
  }

  const topPitchers: TeamPitcherRow[] = Array.from(pitcherAcc.entries())
    .map(([id, v]) => ({
      playerId: id,
      nameKo: v.name,
      appearances: v.fipN,
      avgFip: safeAvg(v.fipSum, v.fipN),
    }))
    .sort((a, b) => {
      const fa = a.avgFip ?? 99;
      const fb = b.avgFip ?? 99;
      if (fa !== fb) return fa - fb;
      return b.appearances - a.appearances;
    })
    .slice(0, 5);

  const recentGames = teamGames
    .sort((a, b) => b.gameDate.localeCompare(a.gameDate))
    .slice(0, 8);

  return {
    code: teamCode,
    name: meta.name,
    shortName: meta.name.split(" ")[0],
    stadium: meta.stadium,
    color: meta.color,
    parkPf: meta.parkPf,
    parkNote: meta.parkNote,
    predictedGames,
    predictedWins,
    predictedWinRate:
      predictedGames > 0 ? predictedWins / predictedGames : null,
    verifiedN,
    correctN,
    accuracyRate: verifiedN > 0 ? correctN / verifiedN : null,
    factorAverages: {
      spFip: safeAvg(spFipSum, spFipN),
      lineupWoba: safeAvg(wobaSum, wobaN),
      bullpenFip: safeAvg(bullpenSum, bullpenN),
      recentForm: safeAvg(formSum, formN),
      elo: safeAvg(eloSum, eloN),
    },
    topPitchers,
    recentGames,
  };
}
