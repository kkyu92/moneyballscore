import { createClient } from "@/lib/supabase/server";
import {
  KBO_TEAMS,
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
  PRODUCTION_COHORT_RULES,
  RECENT_RECORD_MIN_GAMES,
  RECENT_RECORD_WINDOW,
  shortTeamName,
  type SelectResult,
  type TeamCode,
  VENUE_SPLIT_MIN_GAMES_PER_VENUE,
  VENUE_SPLIT_MIN_GAP_PCT,
  WIN_LOSS_STREAK_MIN_LENGTH,
} from "@moneyball/shared";
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

interface MatchupSideStat {
  teamCode: TeamCode;
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

interface MatchupProfile {
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
  /**
   * streak/avgMargin/recentRecord/blowout/closeGame/homeAwayEdge: TeamProfile 와
   * shape-parity 목적으로 개별 필드 보유(테스트 assertion 대상). matchup 페이지는
   * 이 값들을 직접 렌더하지 않고 `summary` 문장으로 합쳐 표시 — team 페이지처럼
   * 개별 stat line 렌더가 빠진 게 아니라 의도된 표시 방식 차이.
   */
  streak: MatchupStreak | null;
  avgMargin: MatchupAvgMargin | null;
  recentRecord: MatchupRecentRecord | null;
  blowout: MatchupBlowoutStats | null;
  closeGame: MatchupCloseGameStats | null;
  homeAwayEdge: MatchupHomeAwaySplit | null;
  summary: string;
}

interface Row {
  confidence: number | null;
  is_correct: boolean | null;
  predicted_winner_team: { code: string | null } | null;
  game: {
    id: number;
    game_date: string;
    status: string | null;
    home_score: number | null;
    away_score: number | null;
    home_team_id: number | null;
    away_team_id: number | null;
    home_team: { code: string | null } | null;
    away_team: { code: string | null } | null;
    winner: { code: string | null } | null;
  } | null;
}

function makeSideStat(code: TeamCode, teamName: string): MatchupSideStat {
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

interface MatchupStreak {
  teamCode: TeamCode;
  length: number;
}

/**
 * 두 팀 맞대결 한정 최근 연승/연패.
 * 계산 로직 자체는 packages/shared 단일 source (computeMatchupStreakFromGames) —
 * cycle 2055 review-code heavy, buildMlbMatchupProfile.computeMlbMatchupStreak 과
 * 독립 중복 통합.
 */
export function computeMatchupStreak(
  games: MatchupGame[],
): MatchupStreak | null {
  return computeMatchupStreakFromGames(games, WIN_LOSS_STREAK_MIN_LENGTH);
}

interface MatchupRecentRecord {
  aWins: number;
  bWins: number;
  sampleSize: number;
}

/**
 * 두 팀 맞대결 한정 최근 N경기 상대전적 (기본 5경기).
 * sideStats(전체 시즌 기록) / computeMatchupStreak(연속 연승·연패) 와 달리
 * "최근 N경기 중 몇 승씩" 형태의 폼 스냅샷. 계산 로직 자체는 packages/shared
 * 단일 source (computeMatchupRecentRecordFromGames) — cycle 2055 review-code
 * heavy, buildMlbMatchupProfile.computeMlbMatchupRecentRecord 과 독립 중복 통합.
 */
export function computeMatchupRecentRecord(
  games: MatchupGame[],
  teamACode: TeamCode,
  teamBCode: TeamCode,
): MatchupRecentRecord | null {
  return computeMatchupRecentRecordFromGames(
    games,
    teamACode,
    teamBCode,
    RECENT_RECORD_WINDOW,
    RECENT_RECORD_MIN_GAMES,
  );
}

interface MatchupAvgMargin {
  avgMargin: number;
  sampleSize: number;
}

/**
 * 두 팀 맞대결 한정 평균 득점 마진 (승패 무관, final 경기 |home-away| 점수차 평균).
 * games 는 buildMatchupProfile 이 이미 조회한 배열 재사용, 신규 DB 조회 없음.
 * 계산 로직 자체는 packages/shared 단일 source (computeAvgMarginFromFinalGames) —
 * cycle 2034 review-code heavy, buildTeamProfile.computeTeamAvgMargin 과 독립 중복 통합.
 */
export function computeMatchupAvgMargin(
  games: MatchupGame[],
): MatchupAvgMargin | null {
  return computeAvgMarginFromFinalGames(
    games,
    (g) => g.status === "final",
    (g) => g.homeScore,
    (g) => g.awayScore,
    MARGIN_AVG_MIN_GAMES,
  );
}

interface MatchupBlowoutStats {
  count: number;
  sampleSize: number;
}

/**
 * 두 팀 맞대결 중 콜드게임(|home-away| >= MARGIN_BLOWOUT_THRESHOLD) 횟수.
 * computeMatchupAvgMargin 과 동일하게 games 배열만 재사용 (신규 DB 조회 없음).
 * "평균 득점차"는 있었지만 "몇 번이나 크게 벌어졌는지" 빈도는 없던 gap.
 * 계산 로직 자체는 packages/shared 단일 source (computeMarginCountFromFinalGames) —
 * cycle 2036 review-code heavy, buildTeamProfile.computeTeamBlowoutCount 과 독립 중복 통합.
 */
export function computeMatchupBlowoutCount(
  games: MatchupGame[],
): MatchupBlowoutStats | null {
  return computeMarginCountFromFinalGames(
    games,
    (g) => g.status === "final",
    (g) => g.homeScore,
    (g) => g.awayScore,
    (margin) => margin >= MARGIN_BLOWOUT_THRESHOLD,
    MARGIN_BLOWOUT_MIN_GAMES,
  );
}

interface MatchupCloseGameStats {
  count: number;
  sampleSize: number;
}

/**
 * 두 팀 맞대결 중 박빙 승부(|home-away| === MARGIN_CLOSE_GAME_THRESHOLD) 횟수.
 * computeMatchupBlowoutCount 의 대칭 지표 — "큰 점수차" 빈도는 있었지만
 * "얼마나 팽팽했는지" 빈도는 없던 gap. games 배열만 재사용 (신규 DB 조회 없음).
 * 계산 로직 자체는 packages/shared 단일 source (computeMarginCountFromFinalGames) —
 * cycle 2036 review-code heavy, buildTeamProfile.computeTeamCloseGameCount 과 독립 중복 통합.
 */
export function computeMatchupCloseGameCount(
  games: MatchupGame[],
): MatchupCloseGameStats | null {
  return computeMarginCountFromFinalGames(
    games,
    (g) => g.status === "final",
    (g) => g.homeScore,
    (g) => g.awayScore,
    (margin) => margin === MARGIN_CLOSE_GAME_THRESHOLD,
    MARGIN_CLOSE_GAME_MIN_GAMES,
  );
}

interface MatchupHomeAwaySplit {
  teamCode: TeamCode;
  homeWins: number;
  homeGames: number;
  awayWins: number;
  awayGames: number;
}

/**
 * 두 팀 맞대결 중 한 팀이 홈/원정에 따라 뚜렷하게 다른 성적을 보이는지 판정.
 * sideStats(전체 wins) 는 홈/원정 승수만 노출(팀별 성과 카드) 하고 벤뉴별 표본(경기 수)
 * 은 계산하지 않아 "편중이 뚜렷한지"는 못 봤던 gap. 계산 로직 자체는 packages/shared
 * 단일 source (computeMatchupHomeAwayEdgeFromGames) — cycle 2055 review-code heavy,
 * buildMlbMatchupProfile.computeMlbMatchupHomeAwayEdge 과 독립 중복 통합.
 */
export function computeMatchupHomeAwayEdge(
  games: MatchupGame[],
  teamACode: TeamCode,
  teamBCode: TeamCode,
): MatchupHomeAwaySplit | null {
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
 * cycle 2071 review-code heavy, buildMlbMatchupProfile.buildSummary 과 독립
 * 중복 통합. blowoutLabel("콜드게임")만 리그별로 다름.
 */
function buildSummary(profile: {
  teamA: MatchupProfile["teamA"];
  teamB: MatchupProfile["teamB"];
  finalGames: number;
  sideStats: MatchupProfile["sideStats"];
  predictionAccuracy: MatchupProfile["predictionAccuracy"];
  streak: MatchupStreak | null;
  avgMargin: MatchupAvgMargin | null;
  recentRecord: MatchupRecentRecord | null;
  blowout: MatchupBlowoutStats | null;
  closeGame: MatchupCloseGameStats | null;
  homeAwayEdge: MatchupHomeAwaySplit | null;
}): string {
  return buildMatchupSummaryText({
    ...profile,
    blowoutSuffix: "콜드게임이었습니다.",
    blowoutThreshold: MARGIN_BLOWOUT_THRESHOLD,
    closeGameThreshold: MARGIN_CLOSE_GAME_THRESHOLD,
  });
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
    shortName: shortTeamName(pair.codeA),
    color: metaA.color,
  };
  const teamB = {
    code: pair.codeB,
    name: metaB.name,
    shortName: shortTeamName(pair.codeB),
    color: metaB.color,
  };

  const supabase = await createClient();

  // teams 테이블에서 두 팀의 id 확보
  // assertSelectOk — error 시 fail-loud (data=null silent fallback → idA/idB
  // undefined → 빈 프로필 silent 반환, 사용자엔 "0 경기" 위장 차단).
  const teamsResult = (await supabase
    .from("teams")
    .select("id, code")
    .in("code", [pair.codeA, pair.codeB])) as SelectResult<
    Array<{ id: number; code: string }>
  >;
  const { data: teamRows } = assertSelectOk(
    teamsResult,
    `buildMatchupProfile teams ${pair.codeA} vs ${pair.codeB}`,
  );
  const teamIdByCode = new Map<string, number>();
  for (const t of teamRows ?? []) {
    teamIdByCode.set(t.code, t.id);
  }
  const idA = teamIdByCode.get(pair.codeA);
  const idB = teamIdByCode.get(pair.codeB);

  if (idA == null || idB == null) {
    // teams row 없어도 빈 프로필 반환
    return {
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
  }

  // 두 팀이 맞붙은 경기만 SQL 레벨로 필터링.
  // predictions 는 LEFT embed (`!inner` X) — pre_game prediction 누락 final 경기도 record 카운트 위해.
  // prediction_type='pre_game' + scoring_rule∈PRODUCTION_COHORT_RULES 필터는 JS 레벨에서 적용
  // (PostgREST 에서 dotted eq + LEFT embed 조합은 모호). scoring_rule 미필터 시 daily.ts 가 매 경기
  // 동일 prediction_type='pre_game' 으로 함께 insert 하는 shadow(v2.1-B-shadow/v2.0-shadow) row 를
  // find() 가 임의 순서로 집어 h2h record/정확도가 shadow 값으로 오염될 수 있음 (#1338 family,
  // buildTeamProfile.ts cycle 2288 fix 와 동일 계열). CURRENT_SCORING_RULE 단일값(v1.8)만 매칭 시
  // legacy v1.8-credit-fail production row 도 함께 오탐 배제됨 — 이 페이지는 baseline calibration
  // 이 아닌 사용자 가시 매치업 기록이라 PRODUCTION_COHORT_RULES 양쪽 포함이 맞음
  // (cycle 2408 analysis/game/[id]/page.tsx 동일 정정 계열, cycle 2409 후속).
  const orFilter =
    `and(home_team_id.eq.${idA},away_team_id.eq.${idB}),` +
    `and(home_team_id.eq.${idB},away_team_id.eq.${idA})`;

  // assertSelectOk — DB 오류 시 fail-loud (data=null silent fallback → 빈 record/
  // 예측 정확도 silent 위장, 사용자엔 "두 팀 맞붙은 적 없음" 위장 차단).
  type GameRow = {
    id: number;
    game_date: string;
    status: string | null;
    home_score: number | null;
    away_score: number | null;
    home_team_id: number | null;
    away_team_id: number | null;
    home_team: { code: string | null } | null;
    away_team: { code: string | null } | null;
    winner: { code: string | null } | null;
    predictions: Array<{
      confidence: number | null;
      is_correct: boolean | null;
      predicted_winner_team: { code: string | null } | null;
      prediction_type: string | null;
      scoring_rule: string | null;
    }> | null;
  };

  const gamesResult = (await supabase
    .from("games")
    .select(
      `
        id, game_date, status, home_score, away_score,
        home_team_id, away_team_id,
        home_team:teams!games_home_team_id_fkey(code),
        away_team:teams!games_away_team_id_fkey(code),
        winner:teams!games_winner_team_id_fkey(code),
        predictions(
          confidence, is_correct,
          predicted_winner_team:teams!predictions_predicted_winner_fkey(code),
          prediction_type, scoring_rule
        )
      `,
    )
    .or(orFilter)
    .order("game_date", { ascending: false })) as SelectResult<GameRow[]>;
  const { data: gamesData } = assertSelectOk(
    gamesResult,
    `buildMatchupProfile games ${pair.codeA} vs ${pair.codeB}`,
  );

  const gameRows = gamesData ?? [];
  const rows: Row[] = [];
  let missingPredictionFinalCount = 0;
  for (const g of gameRows) {
    const pred =
      g.predictions?.find(
        (p) =>
          p.prediction_type === "pre_game" &&
          (PRODUCTION_COHORT_RULES as readonly string[]).includes(
            p.scoring_rule ?? "",
          ),
      ) ?? null;
    if (!pred && g.status === "final") missingPredictionFinalCount += 1;
    rows.push({
      confidence: pred?.confidence ?? null,
      is_correct: pred?.is_correct ?? null,
      predicted_winner_team: pred?.predicted_winner_team ?? null,
      game: {
        id: g.id,
        game_date: g.game_date,
        status: g.status,
        home_score: g.home_score,
        away_score: g.away_score,
        home_team_id: g.home_team_id,
        away_team_id: g.away_team_id,
        home_team: g.home_team,
        away_team: g.away_team,
        winner: g.winner,
      },
    });
  }
  if (missingPredictionFinalCount > 0) {
    console.warn(
      `[buildMatchupProfile] ${pair.codeA} vs ${pair.codeB}: pre_game prediction 부재 final 경기 ${missingPredictionFinalCount}건 — record 카운트는 진행, AI 예측 정확도 카운트만 skip (silent drift 가시화)`,
    );
  }
  const games: MatchupGame[] = [];
  const sideA = makeSideStat(teamA.code, teamA.shortName);
  const sideB = makeSideStat(teamB.code, teamB.shortName);

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

  const finalGames = games.filter((g) => g.status === "final").length;
  const rate = verified > 0 ? correct / verified : null;

  const predictionAccuracy = { verified, correct, rate };
  const sideStats = { a: sideA, b: sideB };
  const streak = computeMatchupStreak(games);
  const avgMargin = computeMatchupAvgMargin(games);
  const recentRecord = computeMatchupRecentRecord(games, teamA.code, teamB.code);
  const blowout = computeMatchupBlowoutCount(games);
  const closeGame = computeMatchupCloseGameCount(games);
  const homeAwayEdge = computeMatchupHomeAwayEdge(games, teamA.code, teamB.code);
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
