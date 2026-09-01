import { createClient } from "@/lib/supabase/server";
import {
  MLB_TEAMS,
  MLB_PRODUCTION_COHORT_RULES,
  assertSelectOk,
  buildMatchupSummaryText,
  computeAvgMarginFromFinalGames,
  computeMarginCountFromFinalGames,
  computeMatchupHomeAwayEdgeFromGames,
  computeMatchupRecentRecordFromGames,
  computeMatchupStreakFromGames,
  MARGIN_AVG_MIN_GAMES,
  MARGIN_BLOWOUT_MIN_GAMES,
  MARGIN_BLOWOUT_THRESHOLD,
  MARGIN_CLOSE_GAME_MIN_GAMES,
  MARGIN_CLOSE_GAME_THRESHOLD,
  RECENT_RECORD_MIN_GAMES,
  RECENT_RECORD_WINDOW,
  mlbShortTeamName,
  normalizeMlbTeamCode,
  toMlbStatsApiCode,
  type SelectResult,
  type MlbTeamCode,
  VENUE_SPLIT_MIN_GAMES_PER_VENUE,
  VENUE_SPLIT_MIN_GAP_PCT,
  WIN_LOSS_STREAK_MIN_LENGTH,
} from "@moneyball/shared";
import type { MlbMatchupPair } from "./mlbCanonicalPair";
import { deriveMlbOutcome } from "./deriveMlbOutcome";

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

interface ScheduleRow {
  id: number;
  external_game_id: string;
  game_date: string;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team_code: string;
  away_team_code: string;
}

interface PredRow {
  external_game_id: string | null;
  home_win_prob: number | null;
}

function makeSideStat(
  code: MlbTeamCode,
  teamName: string,
): MlbMatchupSideStat {
  return {
    teamCode: code,
    teamName,
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

/**
 * 계산 로직 자체는 packages/shared 단일 source (buildMatchupSummaryText) —
 * cycle 2071 review-code heavy, buildMatchupProfile.buildSummary 과 독립
 * 중복 통합. blowoutSuffix("대량득점차 경기였습니다.")만 리그별로 다름.
 */
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
  return buildMatchupSummaryText({
    ...profile,
    blowoutSuffix: "대량득점차 경기였습니다.",
    blowoutThreshold: MARGIN_BLOWOUT_THRESHOLD,
    closeGameThreshold: MARGIN_CLOSE_GAME_THRESHOLD,
  });
}

/**
 * 두 MLB 팀 간 매치업 프로필. KBO buildMatchupProfile 과 동일 구조 —
 * `mlb_schedule`(팀 코드 string) + `predictions`(`external_game_id`, `league='mlb'`)
 * 조인 → 두 팀이 맞붙은 경기만 필터링.
 *
 * cycle 2066 fix (사례 22 후속) — `teams`/`games` FK 는 MLB row 가 0건이라 idA/idB 가
 * 항상 null 이 되어 이 함수가 항상 빈 프로필만 반환했음(Phase 1(cycle 2054)부터 지금까지
 * 프로덕션 실측 미검증, 테스트만 통과). `predicted_winner`/`is_correct`/`confidence`
 * 컬럼도 MLB 전량 NULL(파이프라인이 안 씀) — `home_win_prob` + 실제 스코어로 직접 derive.
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

  // mlb_schedule 은 StatsAPI 컨벤션 저장 — canonical(Baseball-Reference) 코드로 그대로 필터링하면
  // 7팀(TBR/CHW/KCR/SDP/SFG/ARI/WSN)에서 항상 0건 매칭(silent empty, cycle 2081).
  const dbCodeA = toMlbStatsApiCode(pair.codeA);
  const dbCodeB = toMlbStatsApiCode(pair.codeB);
  const orFilter =
    `and(home_team_code.eq.${dbCodeA},away_team_code.eq.${dbCodeB}),` +
    `and(home_team_code.eq.${dbCodeB},away_team_code.eq.${dbCodeA})`;

  const scheduleResult = (await supabase
    .from("mlb_schedule")
    .select("id, external_game_id, game_date, status, home_score, away_score, home_team_code, away_team_code")
    .or(orFilter)
    .order("game_date", { ascending: false })) as SelectResult<ScheduleRow[]>;
  const { data: scheduleData } = assertSelectOk(
    scheduleResult,
    `buildMlbMatchupProfile mlb_schedule ${pair.codeA} vs ${pair.codeB}`,
  );
  const scheduleRows = scheduleData ?? [];

  const emptyResult: MlbMatchupProfile = {
    teamA,
    teamB,
    finalGames: 0,
    sideStats: {
      a: makeSideStat(teamA.code, teamA.shortName),
      b: makeSideStat(teamB.code, teamB.shortName),
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
        a: makeSideStat(teamA.code, teamA.shortName),
        b: makeSideStat(teamB.code, teamB.shortName),
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

  if (scheduleRows.length === 0) return emptyResult;

  const predResult = (await supabase
    .from("predictions")
    .select("external_game_id, home_win_prob")
    .eq("prediction_type", "pre_game")
    .eq("league", "mlb")
    .in("scoring_rule", MLB_PRODUCTION_COHORT_RULES)
    .in(
      "external_game_id",
      scheduleRows.map((s) => s.external_game_id),
    )) as SelectResult<PredRow[]>;
  const { data: predData } = assertSelectOk(
    predResult,
    `buildMlbMatchupProfile predictions ${pair.codeA} vs ${pair.codeB}`,
  );

  const predByExternalId = new Map<string, PredRow>();
  for (const p of predData ?? []) {
    if (p.external_game_id) predByExternalId.set(p.external_game_id, p);
  }

  let missingPredictionFinalCount = 0;
  for (const g of scheduleRows) {
    if (!predByExternalId.has(g.external_game_id) && g.status === "final") {
      missingPredictionFinalCount += 1;
    }
  }
  if (missingPredictionFinalCount > 0) {
    console.warn(
      `[buildMlbMatchupProfile] ${pair.codeA} vs ${pair.codeB}: pre_game prediction 부재 final 경기 ${missingPredictionFinalCount}건 — record 카운트는 진행, AI 예측 정확도 카운트만 skip (silent drift 가시화)`,
    );
  }

  const games: MlbMatchupGame[] = [];
  const sideA = makeSideStat(teamA.code, teamA.shortName);
  const sideB = makeSideStat(teamB.code, teamB.shortName);

  let verified = 0;
  let correct = 0;

  for (const g of scheduleRows) {
    // DB 원본(StatsAPI 컨벤션) → canonical 정규화. 이후 teamA.code/teamB.code(canonical) 비교 안전.
    const homeCode = normalizeMlbTeamCode(g.home_team_code) ?? (g.home_team_code as MlbTeamCode);
    const awayCode = normalizeMlbTeamCode(g.away_team_code) ?? (g.away_team_code as MlbTeamCode);
    const pred = predByExternalId.get(g.external_game_id) ?? null;
    const hasFinalScore = g.status === "final" && g.home_score != null && g.away_score != null;
    const { predictedHomeWin, actualHomeWin, isCorrect, confidence } = deriveMlbOutcome({
      homeWinProb: pred?.home_win_prob,
      hasFinalScore,
      homeScore: g.home_score,
      awayScore: g.away_score,
    });

    const predictedCode: MlbTeamCode | null =
      predictedHomeWin == null ? null : predictedHomeWin ? homeCode : awayCode;
    const actualCode: MlbTeamCode | null =
      actualHomeWin == null ? null : actualHomeWin ? homeCode : awayCode;

    games.push({
      gameId: g.id,
      gameDate: g.game_date,
      homeCode,
      awayCode,
      homeScore: g.home_score,
      awayScore: g.away_score,
      predictedWinnerCode: predictedCode,
      actualWinnerCode: actualCode,
      confidence,
      isCorrect,
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

    if (isCorrect != null) {
      verified += 1;
      if (isCorrect) {
        correct += 1;
        if (predictedCode === teamA.code) sideA.predictedToWinAndCorrect += 1;
        else if (predictedCode === teamB.code)
          sideB.predictedToWinAndCorrect += 1;
      }
    }
  }

  games.sort((a, b) => b.gameDate.localeCompare(a.gameDate));

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
    teamA,
    teamB,
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
