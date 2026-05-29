import { createClient } from '@/lib/supabase/server';
import {
  MLB_TEAMS,
  type MlbTeamCode,
  mlbShortTeamName,
  mlbTeamDivision,
  assertSelectOk,
} from '@moneyball/shared';

export interface MlbTeamRecentGame {
  gameId: number;
  gameDate: string;
  isHome: boolean;
  opponentCode: MlbTeamCode | null;
  opponentName: string | null;
  predictedAsWinner: boolean;
  confidence: number | null;
  isCorrect: boolean | null;
  ourScore: number | null;
  opponentScore: number | null;
  status: string | null;
}

export interface MlbTeamFactorAverages {
  spFip: number | null;
  lineupWoba: number | null;
  bullpenFip: number | null;
  recentForm: number | null;
  elo: number | null;
  lineupXwoba: number | null;
  lineupBarrelPct: number | null;
}

export interface MlbTeamProfile {
  code: MlbTeamCode;
  name: string;
  shortName: string;
  city: string;
  stadium: string;
  color: string;
  parkPf: number;
  league: 'AL' | 'NL';
  division: 'East' | 'Central' | 'West';
  predictedGames: number;
  predictedWins: number;
  predictedWinRate: number | null;
  verifiedN: number;
  correctN: number;
  accuracyRate: number | null;
  factorAverages: MlbTeamFactorAverages;
  recentGames: MlbTeamRecentGame[];
}

interface GameRow {
  id: number;
  game_date: string;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_team: { code: string | null } | null;
  away_team: { code: string | null } | null;
  predictions: Array<{
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
    home_lineup_xwoba: number | null;
    away_lineup_xwoba: number | null;
    home_lineup_barrel_pct: number | null;
    away_lineup_barrel_pct: number | null;
  }>;
}

function safeAvg(sum: number, n: number): number | null {
  return n > 0 ? sum / n : null;
}

// Plan B Tier C+D Task 3 — MLB 팀 프로필 빌더. KBO buildTeamProfile.ts 패턴 정합:
// - assertSelectOk wrap (silent drift family 차단)
// - games inner join predictions (pre_game 만)
// - 14 factor (KBO 10 + Statcast 4 부분 — xwOBA / Barrel%) 집계
export async function buildMlbTeamProfile(
  teamCode: MlbTeamCode,
): Promise<MlbTeamProfile | null> {
  const meta = MLB_TEAMS[teamCode];
  if (!meta) return null;

  const supabase = await createClient();

  const teamResult = await supabase
    .from('teams')
    .select('id')
    .eq('code', teamCode)
    .maybeSingle();

  const { data: teamRow } = assertSelectOk(teamResult, 'buildMlbTeamProfile teams');

  const teamId = (teamRow as { id: number } | null)?.id ?? null;
  const division = mlbTeamDivision(teamCode);

  const emptyProfile: MlbTeamProfile = {
    code: teamCode,
    name: meta.name,
    shortName: mlbShortTeamName(teamCode),
    city: meta.city,
    stadium: meta.stadium,
    color: meta.color,
    parkPf: meta.parkPf,
    league: division.league,
    division: division.division,
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
      lineupXwoba: null,
      lineupBarrelPct: null,
    },
    recentGames: [],
  };

  if (teamId == null) return emptyProfile;

  const gamesResult = await supabase
    .from('games')
    .select(
      `
        id, game_date, status, home_score, away_score,
        home_team_id, away_team_id,
        home_team:teams!games_home_team_id_fkey(code),
        away_team:teams!games_away_team_id_fkey(code),
        predictions!inner(
          confidence, is_correct, predicted_winner,
          home_sp_fip, away_sp_fip,
          home_lineup_woba, away_lineup_woba,
          home_bullpen_fip, away_bullpen_fip,
          home_recent_form, away_recent_form,
          home_elo, away_elo,
          home_lineup_xwoba, away_lineup_xwoba,
          home_lineup_barrel_pct, away_lineup_barrel_pct,
          prediction_type, league
        )
      `,
    )
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq('predictions.prediction_type', 'pre_game')
    .eq('predictions.league', 'mlb');

  const { data } = assertSelectOk(gamesResult, 'buildMlbTeamProfile games');

  const games = (data ?? []) as unknown as GameRow[];

  let predictedGames = 0;
  let predictedWins = 0;
  let verifiedN = 0;
  let correctN = 0;

  let spFipSum = 0, spFipN = 0;
  let wobaSum = 0, wobaN = 0;
  let bullpenSum = 0, bullpenN = 0;
  let formSum = 0, formN = 0;
  let eloSum = 0, eloN = 0;
  let xwobaSum = 0, xwobaN = 0;
  let barrelSum = 0, barrelN = 0;

  const teamGames: MlbTeamRecentGame[] = [];

  for (const g of games) {
    const pred = g.predictions?.[0];
    if (!pred) continue;

    const isHome = g.home_team_id === teamId;
    const isAway = g.away_team_id === teamId;
    if (!isHome && !isAway) continue;

    predictedGames += 1;

    const spFip = isHome ? pred.home_sp_fip : pred.away_sp_fip;
    const woba = isHome ? pred.home_lineup_woba : pred.away_lineup_woba;
    const bullpen = isHome ? pred.home_bullpen_fip : pred.away_bullpen_fip;
    const form = isHome ? pred.home_recent_form : pred.away_recent_form;
    const elo = isHome ? pred.home_elo : pred.away_elo;
    const xwoba = isHome ? pred.home_lineup_xwoba : pred.away_lineup_xwoba;
    const barrel = isHome ? pred.home_lineup_barrel_pct : pred.away_lineup_barrel_pct;

    if (spFip != null) { spFipSum += spFip; spFipN += 1; }
    if (woba != null) { wobaSum += woba; wobaN += 1; }
    if (bullpen != null) { bullpenSum += bullpen; bullpenN += 1; }
    if (form != null) { formSum += form; formN += 1; }
    if (elo != null) { eloSum += elo; eloN += 1; }
    if (xwoba != null) { xwobaSum += xwoba; xwobaN += 1; }
    if (barrel != null) { barrelSum += barrel; barrelN += 1; }

    const predictedThisTeam =
      pred.predicted_winner != null && pred.predicted_winner === teamId;
    if (predictedThisTeam) predictedWins += 1;

    if (pred.is_correct != null) {
      verifiedN += 1;
      if (pred.is_correct) correctN += 1;
    }

    const opponentCode = isHome
      ? (g.away_team?.code as MlbTeamCode | null)
      : (g.home_team?.code as MlbTeamCode | null);

    teamGames.push({
      gameId: g.id,
      gameDate: g.game_date,
      isHome,
      opponentCode,
      opponentName: opponentCode ? mlbShortTeamName(opponentCode) : null,
      predictedAsWinner: predictedThisTeam,
      confidence: pred.confidence,
      isCorrect: pred.is_correct,
      ourScore: isHome ? g.home_score : g.away_score,
      opponentScore: isHome ? g.away_score : g.home_score,
      status: g.status,
    });
  }

  const recentGames = teamGames
    .sort((a, b) => b.gameDate.localeCompare(a.gameDate))
    .slice(0, 8);

  return {
    ...emptyProfile,
    predictedGames,
    predictedWins,
    predictedWinRate: predictedGames > 0 ? predictedWins / predictedGames : null,
    verifiedN,
    correctN,
    accuracyRate: verifiedN > 0 ? correctN / verifiedN : null,
    factorAverages: {
      spFip: safeAvg(spFipSum, spFipN),
      lineupWoba: safeAvg(wobaSum, wobaN),
      bullpenFip: safeAvg(bullpenSum, bullpenN),
      recentForm: safeAvg(formSum, formN),
      elo: safeAvg(eloSum, eloN),
      lineupXwoba: safeAvg(xwobaSum, xwobaN),
      lineupBarrelPct: safeAvg(barrelSum, barrelN),
    },
    recentGames,
  };
}
