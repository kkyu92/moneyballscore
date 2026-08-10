import { createClient } from "@/lib/supabase/server";
import {
  MLB_TEAMS,
  assertSelectOk,
  computeAvgMarginFromFinalGames,
  computeMarginCountFromFinalGames,
  computeMatchupHomeAwayEdgeFromGames,
  computeMatchupRecentRecordFromGames,
  computeMatchupStreakFromGames,
  josa,
  MARGIN_AVG_MIN_GAMES,
  MARGIN_BLOWOUT_MIN_GAMES,
  MARGIN_BLOWOUT_THRESHOLD,
  MARGIN_CLOSE_GAME_MIN_GAMES,
  MARGIN_CLOSE_GAME_THRESHOLD,
  RECENT_RECORD_MIN_GAMES,
  RECENT_RECORD_WINDOW,
  ro,
  mlbShortTeamName,
  type SelectResult,
  type MlbTeamCode,
  VENUE_SPLIT_MIN_GAMES_PER_VENUE,
  VENUE_SPLIT_MIN_GAP_PCT,
  WIN_LOSS_STREAK_MIN_LENGTH,
} from "@moneyball/shared";
import { computeWinRatePct } from "@/lib/analysis/convergenceRecord";
import type { MlbMatchupPair } from "./mlbCanonicalPair";

// KBO buildMatchupProfile.ts 병렬 구현 (plan #24 Phase 1 — risk 최소화 위해 MLB 전용 복제로 시작,
// 후속 review-code(heavy) 에서 단일 source 통합 검토 대상. cycle 2034/2036/2043/2046/2048
// silent drift family 통합 순서(먼저 동작 확보 → 나중에 dedup) 정합).

export interface MlbMatchupGame {
  gameId: number;
  gameDate: string;
  homeCode: MlbTeamCode;
  awayCode: MlbTeamCode;
  homeScore: number | null;
  awayScore: number | null;
  predictedWinnerCode: MlbTeamCode | null;
  actualWinnerCode: MlbTeamCode | null;
  confidence: number | null;
  isCorrect: boolean | null;
  status: string | null;
}

export interface MlbMatchupSideStat {
  teamCode: MlbTeamCode;
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

export interface MlbMatchupProfile {
  pair: MlbMatchupPair;
  teamA: {
    code: MlbTeamCode;
    name: string;
    shortName: string;
    color: string;
  };
  teamB: {
    code: MlbTeamCode;
    name: string;
    shortName: string;
    color: string;
  };
  totalGames: number;
  finalGames: number;
  sideStats: {
    a: MlbMatchupSideStat;
    b: MlbMatchupSideStat;
  };
  predictionAccuracy: {
    verified: number;
    correct: number;
    rate: number | null;
  };
  games: MlbMatchupGame[];
  streak: MlbMatchupStreak | null;
  avgMargin: MlbMatchupAvgMargin | null;
  recentRecord: MlbMatchupRecentRecord | null;
  blowout: MlbMatchupBlowoutStats | null;
  closeGame: MlbMatchupCloseGameStats | null;
  homeAwayEdge: MlbMatchupHomeAwaySplit | null;
  summary: string;
}

interface Row {
  confidence: number | null;
  is_correct: boolean | null;
  predicted_winner: number | null;
  predicted_winner_team: { code: string | null } | null;
  /** null = pre_game prediction 부재 final 경기. record 카운트는 진행, 예측 정확도 카운트는 skip */
  hasPrediction: boolean;
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
  code: MlbTeamCode,
  teamName: string,
  teamColor: string,
): MlbMatchupSideStat {
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

export interface MlbMatchupStreak {
  teamCode: MlbTeamCode;
  length: number;
}

/**
 * 두 팀 맞대결 한정 최근 연승/연패. 계산 로직은 packages/shared 단일 source
 * (computeMatchupStreakFromGames) — cycle 2055 review-code heavy, KBO
 * computeMatchupStreak 과 독립 중복 통합.
 */
export function computeMlbMatchupStreak(
  games: MlbMatchupGame[],
): MlbMatchupStreak | null {
  return computeMatchupStreakFromGames(games, WIN_LOSS_STREAK_MIN_LENGTH);
}

export interface MlbMatchupRecentRecord {
  aWins: number;
  bWins: number;
  sampleSize: number;
}

/**
 * 두 팀 맞대결 한정 최근 N경기 상대전적. 계산 로직은 packages/shared 단일 source
 * (computeMatchupRecentRecordFromGames) — cycle 2055 review-code heavy, KBO
 * computeMatchupRecentRecord 과 독립 중복 통합.
 */
export function computeMlbMatchupRecentRecord(
  games: MlbMatchupGame[],
  teamACode: MlbTeamCode,
  teamBCode: MlbTeamCode,
): MlbMatchupRecentRecord | null {
  return computeMatchupRecentRecordFromGames(
    games,
    teamACode,
    teamBCode,
    RECENT_RECORD_WINDOW,
    RECENT_RECORD_MIN_GAMES,
  );
}

export interface MlbMatchupAvgMargin {
  avgMargin: number;
  sampleSize: number;
}

/**
 * 두 팀 맞대결 한정 평균 득점 마진. 계산 로직은 packages/shared 단일 source
 * (computeAvgMarginFromFinalGames) — TeamCode 비의존 generic 이라 KBO 와 그대로 공유.
 */
export function computeMlbMatchupAvgMargin(
  games: MlbMatchupGame[],
): MlbMatchupAvgMargin | null {
  return computeAvgMarginFromFinalGames(
    games,
    (g) => g.status === "final",
    (g) => g.homeScore,
    (g) => g.awayScore,
    MARGIN_AVG_MIN_GAMES,
  );
}

export interface MlbMatchupBlowoutStats {
  count: number;
  sampleSize: number;
}

/**
 * 두 팀 맞대결 중 대량득점차 경기 횟수. 계산 로직은 packages/shared 단일 source
 * (computeMarginCountFromFinalGames) — TeamCode 비의존 generic 이라 KBO 와 그대로 공유.
 */
export function computeMlbMatchupBlowoutCount(
  games: MlbMatchupGame[],
): MlbMatchupBlowoutStats | null {
  return computeMarginCountFromFinalGames(
    games,
    (g) => g.status === "final",
    (g) => g.homeScore,
    (g) => g.awayScore,
    (margin) => margin >= MARGIN_BLOWOUT_THRESHOLD,
    MARGIN_BLOWOUT_MIN_GAMES,
  );
}

export interface MlbMatchupCloseGameStats {
  count: number;
  sampleSize: number;
}

/**
 * 두 팀 맞대결 중 박빙 승부 횟수. 계산 로직은 packages/shared 단일 source
 * (computeMarginCountFromFinalGames) — TeamCode 비의존 generic 이라 KBO 와 그대로 공유.
 */
export function computeMlbMatchupCloseGameCount(
  games: MlbMatchupGame[],
): MlbMatchupCloseGameStats | null {
  return computeMarginCountFromFinalGames(
    games,
    (g) => g.status === "final",
    (g) => g.homeScore,
    (g) => g.awayScore,
    (margin) => margin === MARGIN_CLOSE_GAME_THRESHOLD,
    MARGIN_CLOSE_GAME_MIN_GAMES,
  );
}

export interface MlbMatchupHomeAwaySplit {
  teamCode: MlbTeamCode;
  homeWins: number;
  homeGames: number;
  awayWins: number;
  awayGames: number;
}

/**
 * 두 팀 맞대결 중 홈/원정 편차 판정. 계산 로직은 packages/shared 단일 source
 * (computeMatchupHomeAwayEdgeFromGames) — cycle 2055 review-code heavy, KBO
 * computeMatchupHomeAwayEdge 와 독립 중복 통합.
 */
export function computeMlbMatchupHomeAwayEdge(
  games: MlbMatchupGame[],
  teamACode: MlbTeamCode,
  teamBCode: MlbTeamCode,
): MlbMatchupHomeAwaySplit | null {
  return computeMatchupHomeAwayEdgeFromGames(
    games,
    teamACode,
    teamBCode,
    VENUE_SPLIT_MIN_GAMES_PER_VENUE,
    VENUE_SPLIT_MIN_GAP_PCT,
  );
}

function buildSummary(profile: {
  teamA: MlbMatchupProfile["teamA"];
  teamB: MlbMatchupProfile["teamB"];
  finalGames: number;
  sideStats: MlbMatchupProfile["sideStats"];
  predictionAccuracy: MlbMatchupProfile["predictionAccuracy"];
  streak: MlbMatchupStreak | null;
  avgMargin: MlbMatchupAvgMargin | null;
  recentRecord: MlbMatchupRecentRecord | null;
  blowout: MlbMatchupBlowoutStats | null;
  closeGame: MlbMatchupCloseGameStats | null;
  homeAwayEdge: MlbMatchupHomeAwaySplit | null;
}): string {
  const {
    teamA,
    teamB,
    finalGames,
    sideStats,
    predictionAccuracy,
    streak,
    avgMargin,
    recentRecord,
    blowout,
    closeGame,
    homeAwayEdge,
  } = profile;

  if (finalGames === 0) {
    return `${teamA.shortName} vs ${teamB.shortName} 상대전적 — 아직 올 시즌 완료된 경기가 없습니다. 경기가 치러지면 여기에 결과와 AI 예측 성과가 기록됩니다.`;
  }

  const aWin = sideStats.a.wins;
  const bWin = sideStats.b.wins;
  const draw = finalGames - aWin - bWin;

  let text = `${teamA.shortName}${josa(teamA.shortName, "과", "와")} ${teamB.shortName}의 올 시즌 상대전적은 ${aWin}승 ${bWin}패`;
  if (draw > 0) text += ` ${draw}무`;
  text += `입니다.`;

  if (aWin !== bWin) {
    const leader = aWin > bWin ? teamA : teamB;
    const leaderWin = Math.max(aWin, bWin);
    const loserWin = Math.min(aWin, bWin);
    const score = `${leaderWin}-${loserWin}`;
    text += ` ${leader.shortName}${josa(leader.shortName, "이", "가")} ${score}${ro(score)} 앞섭니다.`;
  } else {
    text += ` 호각입니다.`;
  }

  if (predictionAccuracy.verified >= 3 && predictionAccuracy.rate !== null) {
    const pct = computeWinRatePct(predictionAccuracy.correct, predictionAccuracy.verified);
    text += ` 이 매치업에서 AI 예측은 ${predictionAccuracy.correct}/${predictionAccuracy.verified}경기 적중 (${pct}%).`;
  }

  if (streak) {
    const streakTeam = streak.teamCode === teamA.code ? teamA : teamB;
    text += ` 최근 맞대결에서 ${streakTeam.shortName}${josa(streakTeam.shortName, "이", "가")} ${streak.length}연승 중입니다.`;
  }

  if (avgMargin) {
    text += ` 이 맞대결의 평균 득점차는 ${avgMargin.avgMargin}점입니다.`;
  }

  if (recentRecord && finalGames > recentRecord.sampleSize) {
    const { aWins, bWins, sampleSize } = recentRecord;
    text += ` 최근 ${sampleSize}경기 맞대결에서는 ${teamA.shortName} ${aWins}승, ${teamB.shortName} ${bWins}승입니다.`;
  }

  if (blowout && blowout.count > 0) {
    text += ` 이 중 ${blowout.count}경기는 ${MARGIN_BLOWOUT_THRESHOLD}점차 이상 대량득점차 경기였습니다.`;
  }

  if (closeGame && closeGame.count > 0) {
    text += ` ${closeGame.count}경기는 ${MARGIN_CLOSE_GAME_THRESHOLD}점차 박빙 승부였습니다.`;
  }

  if (homeAwayEdge) {
    const edgeTeam = homeAwayEdge.teamCode === teamA.code ? teamA : teamB;
    text +=
      ` ${edgeTeam.shortName}${josa(edgeTeam.shortName, "은", "는")} 이 맞대결에서 홈 ${homeAwayEdge.homeWins}승/${homeAwayEdge.homeGames}경기, ` +
      `원정 ${homeAwayEdge.awayWins}승/${homeAwayEdge.awayGames}경기로 홈/원정 성적 차이가 뚜렷합니다.`;
  }

  return text;
}

/**
 * 두 MLB 팀 간 매치업 프로필. KBO buildMatchupProfile 과 동일 구조 —
 * predictions + games 조인 → 두 팀이 맞붙은 경기만 필터링. teams.id 는 팀 코드별로
 * 유일하므로(KBO/MLB 코드 문자 겹치지 않음) 별도 league 필터 없이 team id 쌍으로 이미
 * MLB 경기만 걸러짐.
 */
export async function buildMlbMatchupProfile(
  pair: MlbMatchupPair,
): Promise<MlbMatchupProfile> {
  const metaA = MLB_TEAMS[pair.codeA];
  const metaB = MLB_TEAMS[pair.codeB];
  const teamA = {
    code: pair.codeA,
    name: metaA.name,
    shortName: mlbShortTeamName(pair.codeA),
    color: metaA.color,
  };
  const teamB = {
    code: pair.codeB,
    name: metaB.name,
    shortName: mlbShortTeamName(pair.codeB),
    color: metaB.color,
  };

  const supabase = await createClient();

  const teamsResult = (await supabase
    .from("teams")
    .select("id, code")
    .in("code", [pair.codeA, pair.codeB])) as SelectResult<
    Array<{ id: number; code: string }>
  >;
  const { data: teamRows } = assertSelectOk(
    teamsResult,
    `buildMlbMatchupProfile teams ${pair.codeA} vs ${pair.codeB}`,
  );
  const teamIdByCode = new Map<string, number>();
  for (const t of teamRows ?? []) {
    teamIdByCode.set(t.code, t.id);
  }
  const idA = teamIdByCode.get(pair.codeA);
  const idB = teamIdByCode.get(pair.codeB);

  if (idA == null || idB == null) {
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
      streak: null,
      avgMargin: null,
      recentRecord: null,
      blowout: null,
      closeGame: null,
      homeAwayEdge: null,
      summary: buildSummary({
        teamA,
        teamB,
        finalGames: 0,
        sideStats: {
          a: makeSideStat(teamA.code, teamA.shortName, teamA.color),
          b: makeSideStat(teamB.code, teamB.shortName, teamB.color),
        },
        predictionAccuracy: { verified: 0, correct: 0, rate: null },
        streak: null,
        avgMargin: null,
        recentRecord: null,
        blowout: null,
        closeGame: null,
        homeAwayEdge: null,
      }),
    };
  }

  const orFilter =
    `and(home_team_id.eq.${idA},away_team_id.eq.${idB}),` +
    `and(home_team_id.eq.${idB},away_team_id.eq.${idA})`;

  type GameRow = {
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
    predictions: Array<{
      confidence: number | null;
      is_correct: boolean | null;
      predicted_winner: number | null;
      predicted_winner_team: { code: string | null } | null;
      prediction_type: string | null;
    }> | null;
  };

  const gamesResult = (await supabase
    .from("games")
    .select(
      `
        id, game_date, status, home_score, away_score,
        home_team_id, away_team_id, winner_team_id,
        home_team:teams!games_home_team_id_fkey(id, code),
        away_team:teams!games_away_team_id_fkey(id, code),
        winner:teams!games_winner_team_id_fkey(code),
        predictions(
          confidence, is_correct, predicted_winner,
          predicted_winner_team:teams!predictions_predicted_winner_fkey(code),
          prediction_type
        )
      `,
    )
    .or(orFilter)
    .order("game_date", { ascending: false })) as SelectResult<GameRow[]>;
  const { data: gamesData } = assertSelectOk(
    gamesResult,
    `buildMlbMatchupProfile games ${pair.codeA} vs ${pair.codeB}`,
  );

  const gameRows = gamesData ?? [];
  const rows: Row[] = [];
  let missingPredictionFinalCount = 0;
  for (const g of gameRows) {
    const pred =
      g.predictions?.find((p) => p.prediction_type === "pre_game") ?? null;
    if (!pred && g.status === "final") missingPredictionFinalCount += 1;
    rows.push({
      confidence: pred?.confidence ?? null,
      is_correct: pred?.is_correct ?? null,
      predicted_winner: pred?.predicted_winner ?? null,
      predicted_winner_team: pred?.predicted_winner_team ?? null,
      hasPrediction: pred !== null,
      game: {
        id: g.id,
        game_date: g.game_date,
        status: g.status,
        home_score: g.home_score,
        away_score: g.away_score,
        home_team_id: g.home_team_id,
        away_team_id: g.away_team_id,
        winner_team_id: g.winner_team_id,
        home_team: g.home_team,
        away_team: g.away_team,
        winner: g.winner,
      },
    });
  }
  if (missingPredictionFinalCount > 0) {
    console.warn(
      `[buildMlbMatchupProfile] ${pair.codeA} vs ${pair.codeB}: pre_game prediction 부재 final 경기 ${missingPredictionFinalCount}건 — record 카운트는 진행, AI 예측 정확도 카운트만 skip (silent drift 가시화)`,
    );
  }
  const games: MlbMatchupGame[] = [];
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

    const homeCode = g.home_team?.code as MlbTeamCode;
    const awayCode = g.away_team?.code as MlbTeamCode;
    const predictedCode =
      (r.predicted_winner_team?.code as MlbTeamCode | null) ?? null;
    const actualCode = (g.winner?.code as MlbTeamCode | null) ?? null;

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
  const streak = computeMlbMatchupStreak(games);
  const avgMargin = computeMlbMatchupAvgMargin(games);
  const recentRecord = computeMlbMatchupRecentRecord(games, teamA.code, teamB.code);
  const blowout = computeMlbMatchupBlowoutCount(games);
  const closeGame = computeMlbMatchupCloseGameCount(games);
  const homeAwayEdge = computeMlbMatchupHomeAwayEdge(games, teamA.code, teamB.code);
  const summary = buildSummary({
    teamA,
    teamB,
    finalGames,
    sideStats,
    predictionAccuracy,
    streak,
    avgMargin,
    recentRecord,
    blowout,
    closeGame,
    homeAwayEdge,
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
    streak,
    avgMargin,
    recentRecord,
    blowout,
    closeGame,
    homeAwayEdge,
    summary,
  };
}
