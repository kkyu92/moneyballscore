import { createClient } from "@/lib/supabase/server";
import {
  KBO_TEAMS,
  assertSelectOk,
  josa,
  ro,
  shortTeamName,
  type SelectResult,
  type TeamCode,
} from "@moneyball/shared";
import { computeWinRatePct } from "@/lib/analysis/convergenceRecord";
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

/** 맞대결 최근 연승/연패 스트릭 최소 길이 — 1승만으론 "스트릭"이라 부르기 애매해 배제 */
const MATCHUP_STREAK_MIN_LENGTH = 2;

export interface MatchupStreak {
  teamCode: TeamCode;
  length: number;
}

/**
 * 두 팀 맞대결 한정 최근 연승/연패.
 * games 는 buildMatchupProfile 안에서 game_date 내림차순 정렬 후 전달되지만,
 * 정렬 자체는 예정 경기(미래 날짜)가 최근 완료 경기보다 앞에 올 수 있어
 * status==='final' 필터로 먼저 걸러낸 뒤 상대 순서를 그대로 사용.
 */
export function computeMatchupStreak(
  games: MatchupGame[],
): MatchupStreak | null {
  const finals = games.filter((g) => g.status === "final");
  if (finals.length === 0) return null;

  // 가장 최근 완료 경기가 무승부(승자 없음)면 진행 중인 스트릭 없음
  const streakCode = finals[0].actualWinnerCode;
  if (!streakCode) return null;

  let length = 0;
  for (const g of finals) {
    if (g.actualWinnerCode !== streakCode) break;
    length += 1;
  }

  if (length < MATCHUP_STREAK_MIN_LENGTH) return null;
  return { teamCode: streakCode, length };
}

/** 맞대결 최근 N경기 한정 상대전적 — 시즌 전체 기록(sideStats)과 달리 최근 폼만 반영 */
const MATCHUP_RECENT_RECORD_WINDOW = 5;
/** 최근 기록 최소 표본 — 1경기만으론 "최근 전적"이라 부르기 애매해 배제 (avgMargin 과 동일 기준) */
const MATCHUP_RECENT_RECORD_MIN_GAMES = 2;

export interface MatchupRecentRecord {
  aWins: number;
  bWins: number;
  sampleSize: number;
}

/**
 * 두 팀 맞대결 한정 최근 N경기 상대전적 (기본 5경기).
 * sideStats(전체 시즌 기록) / computeMatchupStreak(연속 연승·연패) 와 달리
 * "최근 N경기 중 몇 승씩" 형태의 폼 스냅샷. games 는 이미 game_date 내림차순 정렬 —
 * status==='final' 필터 후 앞에서부터 window 개수만 사용.
 */
export function computeMatchupRecentRecord(
  games: MatchupGame[],
  teamACode: TeamCode,
  teamBCode: TeamCode,
): MatchupRecentRecord | null {
  const finals = games.filter((g) => g.status === "final");
  const recent = finals.slice(0, MATCHUP_RECENT_RECORD_WINDOW);
  if (recent.length < MATCHUP_RECENT_RECORD_MIN_GAMES) return null;

  let aWins = 0;
  let bWins = 0;
  for (const g of recent) {
    if (g.actualWinnerCode === teamACode) aWins += 1;
    else if (g.actualWinnerCode === teamBCode) bWins += 1;
  }
  return { aWins, bWins, sampleSize: recent.length };
}

/** 맞대결 평균 득점 마진 최소 표본 — 1경기만으론 "평균"이라 부르기 애매해 배제 */
const MATCHUP_AVG_MARGIN_MIN_GAMES = 2;

export interface MatchupAvgMargin {
  avgMargin: number;
  sampleSize: number;
}

/**
 * 두 팀 맞대결 한정 평균 득점 마진 (승패 무관, final 경기 |home-away| 점수차 평균).
 * games 는 buildMatchupProfile 이 이미 조회한 배열 재사용, 신규 DB 조회 없음.
 */
export function computeMatchupAvgMargin(
  games: MatchupGame[],
): MatchupAvgMargin | null {
  const margins = games
    .filter(
      (g) => g.status === "final" && g.homeScore != null && g.awayScore != null,
    )
    .map((g) => Math.abs((g.homeScore as number) - (g.awayScore as number)));

  if (margins.length < MATCHUP_AVG_MARGIN_MIN_GAMES) return null;

  const avg = margins.reduce((sum, m) => sum + m, 0) / margins.length;
  return { avgMargin: Math.round(avg * 10) / 10, sampleSize: margins.length };
}

/** 콜드게임(대량 득점차) 판정 기준 — |home-away| 10점 이상 */
const MATCHUP_BLOWOUT_MARGIN = 10;
/** 콜드게임 횟수 최소 표본 — 1~2경기 중 콜드게임 유무는 "이 맞대결 성향"이라 부르기 애매해 배제 */
const MATCHUP_BLOWOUT_MIN_GAMES = 3;

export interface MatchupBlowoutStats {
  count: number;
  sampleSize: number;
}

/**
 * 두 팀 맞대결 중 콜드게임(|home-away| >= MATCHUP_BLOWOUT_MARGIN) 횟수.
 * computeMatchupAvgMargin 과 동일하게 games 배열만 재사용 (신규 DB 조회 없음).
 * "평균 득점차"는 있었지만 "몇 번이나 크게 벌어졌는지" 빈도는 없던 gap.
 */
export function computeMatchupBlowoutCount(
  games: MatchupGame[],
): MatchupBlowoutStats | null {
  const finals = games.filter(
    (g) => g.status === "final" && g.homeScore != null && g.awayScore != null,
  );
  if (finals.length < MATCHUP_BLOWOUT_MIN_GAMES) return null;

  const count = finals.filter(
    (g) => Math.abs((g.homeScore as number) - (g.awayScore as number)) >= MATCHUP_BLOWOUT_MARGIN,
  ).length;

  return { count, sampleSize: finals.length };
}

/** 박빙 승부(한 점차) 판정 기준 — |home-away| == 1 */
const MATCHUP_CLOSE_GAME_MARGIN = 1;
/** 박빙 승부 횟수 최소 표본 — blowout 과 동일 기준 (1~2경기 중 유무는 "성향"이라 부르기 애매) */
const MATCHUP_CLOSE_GAME_MIN_GAMES = 3;

export interface MatchupCloseGameStats {
  count: number;
  sampleSize: number;
}

/**
 * 두 팀 맞대결 중 박빙 승부(|home-away| === MATCHUP_CLOSE_GAME_MARGIN) 횟수.
 * computeMatchupBlowoutCount 의 대칭 지표 — "큰 점수차" 빈도는 있었지만
 * "얼마나 팽팽했는지" 빈도는 없던 gap. games 배열만 재사용 (신규 DB 조회 없음).
 */
export function computeMatchupCloseGameCount(
  games: MatchupGame[],
): MatchupCloseGameStats | null {
  const finals = games.filter(
    (g) => g.status === "final" && g.homeScore != null && g.awayScore != null,
  );
  if (finals.length < MATCHUP_CLOSE_GAME_MIN_GAMES) return null;

  const count = finals.filter(
    (g) => Math.abs((g.homeScore as number) - (g.awayScore as number)) === MATCHUP_CLOSE_GAME_MARGIN,
  ).length;

  return { count, sampleSize: finals.length };
}

/** 맞대결 홈/원정 편중 판정 — 벤뉴(홈/원정)당 최소 표본 (avgMargin 과 동일 기준선) */
const MATCHUP_HOME_AWAY_MIN_GAMES_PER_VENUE = 2;
/** 홈/원정 승률 차이가 이 %p 이상이어야 "편중" 으로 언급 — 우연한 소표본 노이즈 배제 */
const MATCHUP_HOME_AWAY_MIN_GAP_PCT = 40;

export interface MatchupHomeAwaySplit {
  teamCode: TeamCode;
  homeWins: number;
  homeGames: number;
  awayWins: number;
  awayGames: number;
}

function venueSplit(
  games: MatchupGame[],
  code: TeamCode,
): { homeWins: number; homeGames: number; awayWins: number; awayGames: number } {
  let homeWins = 0;
  let homeGames = 0;
  let awayWins = 0;
  let awayGames = 0;
  for (const g of games) {
    if (g.status !== "final") continue;
    if (g.homeCode === code) {
      homeGames += 1;
      if (g.actualWinnerCode === code) homeWins += 1;
    } else if (g.awayCode === code) {
      awayGames += 1;
      if (g.actualWinnerCode === code) awayWins += 1;
    }
  }
  return { homeWins, homeGames, awayWins, awayGames };
}

/**
 * 두 팀 맞대결 중 한 팀이 홈/원정에 따라 뚜렷하게 다른 성적을 보이는지 판정.
 * sideStats(전체 wins) 는 홈/원정 승수만 노출(팀별 성과 카드) 하고 벤뉴별 표본(경기 수)
 * 은 계산하지 않아 "편중이 뚜렷한지"는 못 봤던 gap. games 배열만 재사용 (신규 DB 조회 없음).
 * 두 팀 모두 조건 충족 시 격차가 더 큰 쪽 1팀만 반환 (문장 노이즈 방지).
 */
export function computeMatchupHomeAwayEdge(
  games: MatchupGame[],
  teamACode: TeamCode,
  teamBCode: TeamCode,
): MatchupHomeAwaySplit | null {
  const candidates: Array<{ code: TeamCode; gapPct: number } & ReturnType<typeof venueSplit>> = [];
  for (const code of [teamACode, teamBCode]) {
    const split = venueSplit(games, code);
    if (
      split.homeGames < MATCHUP_HOME_AWAY_MIN_GAMES_PER_VENUE ||
      split.awayGames < MATCHUP_HOME_AWAY_MIN_GAMES_PER_VENUE
    ) {
      continue;
    }
    const homeRate = (split.homeWins / split.homeGames) * 100;
    const awayRate = (split.awayWins / split.awayGames) * 100;
    candidates.push({ code, gapPct: Math.abs(homeRate - awayRate), ...split });
  }

  if (candidates.length === 0) return null;

  const best = candidates.reduce((a, b) => (b.gapPct > a.gapPct ? b : a));
  if (best.gapPct < MATCHUP_HOME_AWAY_MIN_GAP_PCT) return null;

  return {
    teamCode: best.code,
    homeWins: best.homeWins,
    homeGames: best.homeGames,
    awayWins: best.awayWins,
    awayGames: best.awayGames,
  };
}

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

  // 리드 팀
  if (aWin !== bWin) {
    const leader = aWin > bWin ? teamA : teamB;
    const leaderWin = Math.max(aWin, bWin);
    const loserWin = Math.min(aWin, bWin);
    const score = `${leaderWin}-${loserWin}`;
    text += ` ${leader.shortName}${josa(leader.shortName, "이", "가")} ${score}${ro(score)} 앞섭니다.`;
  } else {
    text += ` 호각입니다.`;
  }

  // 예측 성과
  if (predictionAccuracy.verified >= 3 && predictionAccuracy.rate !== null) {
    const pct = computeWinRatePct(predictionAccuracy.correct, predictionAccuracy.verified);
    text += ` 이 매치업에서 AI 예측은 ${predictionAccuracy.correct}/${predictionAccuracy.verified}경기 적중 (${pct}%).`;
  }

  // 맞대결 연승/연패 스트릭
  if (streak) {
    const streakTeam = streak.teamCode === teamA.code ? teamA : teamB;
    text += ` 최근 맞대결에서 ${streakTeam.shortName}${josa(streakTeam.shortName, "이", "가")} ${streak.length}연승 중입니다.`;
  }

  // 평균 득점 마진
  if (avgMargin) {
    text += ` 이 맞대결의 평균 득점차는 ${avgMargin.avgMargin}점입니다.`;
  }

  // 최근 N경기 한정 상대전적 — 전체 시즌 기록과 표본이 다를 때만 (동일하면 위 문장과 중복이라 skip)
  if (recentRecord && finalGames > recentRecord.sampleSize) {
    const { aWins, bWins, sampleSize } = recentRecord;
    text += ` 최근 ${sampleSize}경기 맞대결에서는 ${teamA.shortName} ${aWins}승, ${teamB.shortName} ${bWins}승입니다.`;
  }

  // 콜드게임 빈도 — 0건이면 "대량 득점차 없이 팽팽했다"는 의미 자체는 있으나
  // avgMargin 문장과 중복 인상을 줘 count > 0 일 때만 언급
  if (blowout && blowout.count > 0) {
    text += ` 이 중 ${blowout.count}경기는 ${MATCHUP_BLOWOUT_MARGIN}점차 이상 콜드게임이었습니다.`;
  }

  // 박빙 승부 빈도 — 0건이면 blowout 문장과 중복 인상이라 count > 0 일 때만 언급
  if (closeGame && closeGame.count > 0) {
    text += ` ${closeGame.count}경기는 ${MATCHUP_CLOSE_GAME_MARGIN}점차 박빙 승부였습니다.`;
  }

  // 홈/원정 편중 — 벤뉴별 표본 확보 + 승률 차이가 뚜렷할 때만 언급
  if (homeAwayEdge) {
    const edgeTeam = homeAwayEdge.teamCode === teamA.code ? teamA : teamB;
    text +=
      ` ${edgeTeam.shortName}${josa(edgeTeam.shortName, "은", "는")} 이 맞대결에서 홈 ${homeAwayEdge.homeWins}승/${homeAwayEdge.homeGames}경기, ` +
      `원정 ${homeAwayEdge.awayWins}승/${homeAwayEdge.awayGames}경기로 홈/원정 성적 차이가 뚜렷합니다.`;
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

  // 두 팀이 맞붙은 경기만 SQL 레벨로 필터링.
  // predictions 는 LEFT embed (`!inner` X) — pre_game prediction 누락 final 경기도 record 카운트 위해.
  // prediction_type='pre_game' 필터는 JS 레벨에서 적용 (PostgREST 에서 dotted eq + LEFT embed 조합은 모호).
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
    `buildMatchupProfile games ${pair.codeA} vs ${pair.codeB}`,
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
      `[buildMatchupProfile] ${pair.codeA} vs ${pair.codeB}: pre_game prediction 부재 final 경기 ${missingPredictionFinalCount}건 — record 카운트는 진행, AI 예측 정확도 카운트만 skip (silent drift 가시화)`,
    );
  }
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
