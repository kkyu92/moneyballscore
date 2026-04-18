import { createClient } from "@/lib/supabase/server";
import { KBO_TEAMS, type TeamCode } from "@moneyball/shared";
import type { MatchupPair } from "./canonicalPair";

export interface MatchupGame {
  gameId: number;
  gameDate: string;
  homeCode: TeamCode;
  awayCode: TeamCode;
  homeScore: number | null;
  awayScore: number | null;
  predictedWinnerCode: TeamCode | null;
  actualWinnerCode: TeamCode | null;
  confidence: number | null;
  isCorrect: boolean | null;
  status: string | null;
}

export interface MatchupSideStat {
  teamCode: TeamCode;
  teamName: string;
  teamColor: string;
  /** 이 팀이 이긴 경기 수 (final 기준) */
  wins: number;
  /** 이 팀이 홈이었을 때 승 */
  homeWins: number;
  /** 이 팀이 원정이었을 때 승 */
  awayWins: number;
  /** AI가 이 팀이 이길 거라고 예측한 경기 수 */
  predictedToWin: number;
  /** 위 중 실제 적중 */
  predictedToWinAndCorrect: number;
}

export interface MatchupProfile {
  pair: MatchupPair;
  teamA: {
    code: TeamCode;
    name: string;
    shortName: string;
    color: string;
  };
  teamB: {
    code: TeamCode;
    name: string;
    shortName: string;
    color: string;
  };
  totalGames: number;
  finalGames: number;
  sideStats: {
    a: MatchupSideStat;
    b: MatchupSideStat;
  };
  predictionAccuracy: {
    verified: number;
    correct: number;
    rate: number | null;
  };
  games: MatchupGame[];
  summary: string;
}

interface Row {
  confidence: number | null;
  is_correct: boolean | null;
  predicted_winner: number | null;
  predicted_winner_team: { code: string | null } | null;
  game: {
    id: number;
    game_date: string;
    status: string | null;
    home_score: number | null;
    away_score: number | null;
    home_team_id: number | null;
    away_team_id: number | null;
    winner_team_id: number | null;
    home_team: { id: number; code: string | null } | null;
    away_team: { id: number; code: string | null } | null;
    winner: { code: string | null } | null;
  } | null;
}

function makeSideStat(
  code: TeamCode,
  teamName: string,
  teamColor: string,
): MatchupSideStat {
  return {
    teamCode: code,
    teamName,
    teamColor,
    wins: 0,
    homeWins: 0,
    awayWins: 0,
    predictedToWin: 0,
    predictedToWinAndCorrect: 0,
  };
}

function buildSummary(profile: {
  teamA: MatchupProfile["teamA"];
  teamB: MatchupProfile["teamB"];
  finalGames: number;
  sideStats: MatchupProfile["sideStats"];
  predictionAccuracy: MatchupProfile["predictionAccuracy"];
}): string {
  const { teamA, teamB, finalGames, sideStats, predictionAccuracy } = profile;

  if (finalGames === 0) {
    return `${teamA.shortName} vs ${teamB.shortName} 상대전적 — 아직 올 시즌 완료된 경기가 없습니다. 경기가 치러지면 여기에 결과와 AI 예측 성과가 기록됩니다.`;
  }

  const aWin = sideStats.a.wins;
  const bWin = sideStats.b.wins;
  const draw = finalGames - aWin - bWin;

  let text = `${teamA.shortName}과 ${teamB.shortName}의 올 시즌 상대전적은 ${aWin}승 ${bWin}패`;
  if (draw > 0) text += ` ${draw}무`;
  text += `입니다.`;

  // 리드 팀
  if (aWin !== bWin) {
    const leader = aWin > bWin ? teamA : teamB;
    const leaderWin = Math.max(aWin, bWin);
    const loserWin = Math.min(aWin, bWin);
    text += ` ${leader.shortName}이 ${leaderWin}-${loserWin}로 앞섭니다.`;
  } else {
    text += ` 호각입니다.`;
  }

  // 예측 성과
  if (predictionAccuracy.verified >= 3 && predictionAccuracy.rate !== null) {
    const pct = Math.round(predictionAccuracy.rate * 100);
    text += ` 이 매치업에서 AI 예측은 ${predictionAccuracy.correct}/${predictionAccuracy.verified}경기 적중 (${pct}%).`;
  }

  return text;
}

/**
 * 두 팀 간 매치업 프로필.
 * predictions + games 조인 → 두 팀이 맞붙은 경기만 필터링.
 * 모든 경기(예측 + 결과) 리스트 + sideStats + 예측 정확도.
 */
export async function buildMatchupProfile(
  pair: MatchupPair,
): Promise<MatchupProfile> {
  const metaA = KBO_TEAMS[pair.codeA];
  const metaB = KBO_TEAMS[pair.codeB];
  const teamA = {
    code: pair.codeA,
    name: metaA.name,
    shortName: metaA.name.split(" ")[0],
    color: metaA.color,
  };
  const teamB = {
    code: pair.codeB,
    name: metaB.name,
    shortName: metaB.name.split(" ")[0],
    color: metaB.color,
  };

  const supabase = await createClient();

  // teams 테이블에서 두 팀의 id 확보
  const { data: teamRows } = await supabase
    .from("teams")
    .select("id, code")
    .in("code", [pair.codeA, pair.codeB]);
  const teamIdByCode = new Map<string, number>();
  for (const t of (teamRows ?? []) as Array<{ id: number; code: string }>) {
    teamIdByCode.set(t.code, t.id);
  }
  const idA = teamIdByCode.get(pair.codeA);
  const idB = teamIdByCode.get(pair.codeB);

  if (idA == null || idB == null) {
    // teams row 없어도 빈 프로필 반환
    return {
      pair,
      teamA,
      teamB,
      totalGames: 0,
      finalGames: 0,
      sideStats: {
        a: makeSideStat(teamA.code, teamA.shortName, teamA.color),
        b: makeSideStat(teamB.code, teamB.shortName, teamB.color),
      },
      predictionAccuracy: { verified: 0, correct: 0, rate: null },
      games: [],
      summary: buildSummary({
        teamA,
        teamB,
        finalGames: 0,
        sideStats: {
          a: makeSideStat(teamA.code, teamA.shortName, teamA.color),
          b: makeSideStat(teamB.code, teamB.shortName, teamB.color),
        },
        predictionAccuracy: { verified: 0, correct: 0, rate: null },
      }),
    };
  }

  // 두 팀이 맞붙은 경기의 pre_game predictions 전부
  const { data } = await supabase
    .from("predictions")
    .select(
      `
        confidence, is_correct, predicted_winner,
        predicted_winner_team:teams!predictions_predicted_winner_fkey(code),
        game:games!predictions_game_id_fkey(
          id, game_date, status, home_score, away_score,
          home_team_id, away_team_id, winner_team_id,
          home_team:teams!games_home_team_id_fkey(id, code),
          away_team:teams!games_away_team_id_fkey(id, code),
          winner:teams!games_winner_team_id_fkey(code)
        )
      `,
    )
    .eq("prediction_type", "pre_game");

  const rows = (data ?? []) as unknown as Row[];
  const games: MatchupGame[] = [];
  const sideA = makeSideStat(teamA.code, teamA.shortName, teamA.color);
  const sideB = makeSideStat(teamB.code, teamB.shortName, teamB.color);

  let verified = 0;
  let correct = 0;

  for (const r of rows) {
    const g = r.game;
    if (!g) continue;
    const homeTeamId = g.home_team_id;
    const awayTeamId = g.away_team_id;
    if (homeTeamId == null || awayTeamId == null) continue;

    const pairSet = new Set([homeTeamId, awayTeamId]);
    if (!(pairSet.has(idA) && pairSet.has(idB))) continue;

    const homeCode = g.home_team?.code as TeamCode;
    const awayCode = g.away_team?.code as TeamCode;
    const predictedCode =
      (r.predicted_winner_team?.code as TeamCode | null) ?? null;
    const actualCode = (g.winner?.code as TeamCode | null) ?? null;

    games.push({
      gameId: g.id,
      gameDate: g.game_date,
      homeCode,
      awayCode,
      homeScore: g.home_score,
      awayScore: g.away_score,
      predictedWinnerCode: predictedCode,
      actualWinnerCode: actualCode,
      confidence: r.confidence,
      isCorrect: r.is_correct,
      status: g.status,
    });

    if (g.status === "final" && actualCode) {
      const winnerIsA = actualCode === teamA.code;
      const winnerIsB = actualCode === teamB.code;
      const aIsHome = homeCode === teamA.code;
      const bIsHome = homeCode === teamB.code;
      if (winnerIsA) {
        sideA.wins += 1;
        if (aIsHome) sideA.homeWins += 1;
        else sideA.awayWins += 1;
      } else if (winnerIsB) {
        sideB.wins += 1;
        if (bIsHome) sideB.homeWins += 1;
        else sideB.awayWins += 1;
      }
    }

    if (predictedCode === teamA.code) sideA.predictedToWin += 1;
    else if (predictedCode === teamB.code) sideB.predictedToWin += 1;

    if (r.is_correct != null) {
      verified += 1;
      if (r.is_correct) {
        correct += 1;
        if (predictedCode === teamA.code) sideA.predictedToWinAndCorrect += 1;
        else if (predictedCode === teamB.code)
          sideB.predictedToWinAndCorrect += 1;
      }
    }
  }

  games.sort((a, b) => b.gameDate.localeCompare(a.gameDate));

  const totalGames = games.length;
  const finalGames = games.filter((g) => g.status === "final").length;
  const rate = verified > 0 ? correct / verified : null;

  const predictionAccuracy = { verified, correct, rate };
  const sideStats = { a: sideA, b: sideB };
  const summary = buildSummary({
    teamA,
    teamB,
    finalGames,
    sideStats,
    predictionAccuracy,
  });

  return {
    pair,
    teamA,
    teamB,
    totalGames,
    finalGames,
    sideStats,
    predictionAccuracy,
    games,
    summary,
  };
}
