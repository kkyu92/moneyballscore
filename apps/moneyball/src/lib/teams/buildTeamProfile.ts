import { createClient } from "@/lib/supabase/server";
import { KBO_TEAMS, type TeamCode, shortTeamName, assertSelectOk, computeAvgMarginFromFinalGames, computeMarginCountFromFinalGames, computeFactorAveragesFromPerspectives, type FactorPerspective, WIN_LOSS_STREAK_MIN_LENGTH, RECENT_RECORD_WINDOW, RECENT_RECORD_MIN_GAMES, MARGIN_AVG_MIN_GAMES, MARGIN_BLOWOUT_THRESHOLD, MARGIN_BLOWOUT_MIN_GAMES, MARGIN_CLOSE_GAME_THRESHOLD, MARGIN_CLOSE_GAME_MIN_GAMES, VENUE_SPLIT_MIN_GAMES_PER_VENUE, VENUE_SPLIT_MIN_GAP_PCT, PRODUCTION_COHORT_RULES } from '@moneyball/shared';
import { EMPTY_FACTOR_AVERAGES, type TeamFactorAverages } from "./buildTeamFactorAverages";

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
  opponentName: string | null;
  predictedAsWinner: boolean;
  confidence: number | null;
  isCorrect: boolean | null;
  ourScore: number | null;
  opponentScore: number | null;
  status: string | null;
}

export interface TeamProfile {
  code: TeamCode;
  name: string;
  shortName: string;
  stadium: string;
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
  streak: TeamStreak | null;
  avgMargin: TeamAvgMargin | null;
  blowout: TeamBlowoutStats | null;
  closeGame: TeamCloseGameStats | null;
  homeAwayEdge: TeamHomeAwaySplit | null;
  recentRecord: TeamRecentRecord | null;
}

export interface TeamAvgMargin {
  avgMargin: number;
  sampleSize: number;
}

/**
 * 팀의 시즌 전체 평균 득점 마진 (승패 무관, final 경기 |자팀-상대| 점수차 평균).
 * buildMatchupProfile 의 computeMatchupAvgMargin 은 두 팀 맞대결 한정 —
 * 이 팀의 "모든 상대 포함 시즌 전체" 평균 마진은 없던 gap. teamGames 배열만
 * 재사용 (신규 DB 조회 없음). 계산 로직 자체는 packages/shared 단일 source
 * (computeAvgMarginFromFinalGames) — cycle 2034 review-code heavy, matchup 쪽
 * computeMatchupAvgMargin 과 독립 중복 통합.
 */
export function computeTeamAvgMargin(
  games: StreakGame[],
): TeamAvgMargin | null {
  return computeAvgMarginFromFinalGames(
    games,
    (g) => g.status === "final",
    (g) => g.ourScore,
    (g) => g.opponentScore,
    MARGIN_AVG_MIN_GAMES,
  );
}

export interface TeamBlowoutStats {
  count: number;
  sampleSize: number;
}

/**
 * 이 팀이 시즌 전체에서 콜드게임(|자팀-상대| >= MARGIN_BLOWOUT_THRESHOLD) 을 겪은 횟수.
 * buildMatchupProfile 의 computeMatchupBlowoutCount 는 두 팀 맞대결 한정 —
 * "이 팀이 모든 상대 포함 시즌 전체에서" 몇 번이나 콜드게임을 겪었는지는 없던 gap.
 * teamGames 배열만 재사용 (신규 DB 조회 없음). 계산 로직 자체는 packages/shared 단일 source
 * (computeMarginCountFromFinalGames) — cycle 2036 review-code heavy, matchup 쪽
 * computeMatchupBlowoutCount 과 독립 중복 통합.
 */
export function computeTeamBlowoutCount(
  games: StreakGame[],
): TeamBlowoutStats | null {
  return computeMarginCountFromFinalGames(
    games,
    (g) => g.status === "final",
    (g) => g.ourScore,
    (g) => g.opponentScore,
    (margin) => margin >= MARGIN_BLOWOUT_THRESHOLD,
    MARGIN_BLOWOUT_MIN_GAMES,
  );
}

export interface TeamCloseGameStats {
  count: number;
  sampleSize: number;
}

/**
 * 이 팀이 시즌 전체에서 박빙 승부(|자팀-상대| === MARGIN_CLOSE_GAME_THRESHOLD) 를 겪은 횟수.
 * computeTeamBlowoutCount 의 대칭 지표 — teamGames 배열만 재사용 (신규 DB 조회 없음).
 * 계산 로직 자체는 packages/shared 단일 source (computeMarginCountFromFinalGames) —
 * cycle 2036 review-code heavy, matchup 쪽 computeMatchupCloseGameCount 과 독립 중복 통합.
 */
export function computeTeamCloseGameCount(
  games: StreakGame[],
): TeamCloseGameStats | null {
  return computeMarginCountFromFinalGames(
    games,
    (g) => g.status === "final",
    (g) => g.ourScore,
    (g) => g.opponentScore,
    (margin) => margin === MARGIN_CLOSE_GAME_THRESHOLD,
    MARGIN_CLOSE_GAME_MIN_GAMES,
  );
}

export interface TeamHomeAwaySplit {
  homeWins: number;
  homeGames: number;
  awayWins: number;
  awayGames: number;
}

/**
 * 이 팀의 시즌 전체 홈/원정 승률 편차. buildMatchupProfile 의
 * computeMatchupHomeAwayEdge 는 두 팀 맞대결 한정 벤뉴 편차 — "이 팀이 모든 상대
 * 포함 시즌 전체에서" 홈/원정 성적이 뚜렷하게 다른지는 없던 gap. teamGames 배열만
 * 재사용 (신규 DB 조회 없음).
 */
/** computeTeamHomeAwayEdge 이 실제로 읽는 필드만 (KBO/MLB TeamRecentGame 양쪽 구조적 호환). */
export type HomeAwayGame = StreakGame & { isHome: boolean };

export function computeTeamHomeAwayEdge(
  games: HomeAwayGame[],
): TeamHomeAwaySplit | null {
  let homeWins = 0;
  let homeGames = 0;
  let awayWins = 0;
  let awayGames = 0;

  for (const g of games) {
    if (g.status !== "final") continue;
    if (g.ourScore == null || g.opponentScore == null) continue;
    const won = g.ourScore > g.opponentScore;
    if (g.isHome) {
      homeGames += 1;
      if (won) homeWins += 1;
    } else {
      awayGames += 1;
      if (won) awayWins += 1;
    }
  }

  if (
    homeGames < VENUE_SPLIT_MIN_GAMES_PER_VENUE ||
    awayGames < VENUE_SPLIT_MIN_GAMES_PER_VENUE
  ) {
    return null;
  }

  const homeRate = (homeWins / homeGames) * 100;
  const awayRate = (awayWins / awayGames) * 100;
  if (Math.abs(homeRate - awayRate) < VENUE_SPLIT_MIN_GAP_PCT) return null;

  return { homeWins, homeGames, awayWins, awayGames };
}

export interface TeamStreak {
  result: "win" | "loss";
  length: number;
}

/** computeTeamStreak 이 실제로 읽는 필드만 (KBO/MLB TeamRecentGame 양쪽 구조적 호환). */
export type StreakGame = {
  status: string | null;
  ourScore: number | null;
  opponentScore: number | null;
};

/**
 * 이 팀의 시즌 전체(모든 상대 포함) 최근 연승/연패.
 * buildMatchupProfile 의 computeMatchupStreak 은 두 팀 맞대결 한정 스트릭 —
 * "이 팀이 모든 상대 포함 최근 전체 흐름에서" 몇 연승/연패 중인지는 없던 gap.
 * teamGames 는 buildTeamProfile 안에서 game_date 내림차순 정렬 후 전달.
 * KBO_TEAMS/MLB_TEAMS 양쪽 TeamRecentGame 타입이 구조적으로 호환되므로
 * buildMlbTeamProfile 도 본 함수를 그대로 재사용 (신규 MLB_ 접두 중복 함수 X).
 */
export function computeTeamStreak(games: StreakGame[]): TeamStreak | null {
  const finals = games.filter(
    (g) => g.status === "final" && g.ourScore != null && g.opponentScore != null,
  );
  if (finals.length === 0) return null;

  const first = finals[0];
  if (first.ourScore === first.opponentScore) return null; // 무승부는 스트릭 없음

  const result: "win" | "loss" =
    (first.ourScore as number) > (first.opponentScore as number) ? "win" : "loss";

  let length = 0;
  for (const g of finals) {
    if (g.ourScore === g.opponentScore) break;
    const won = (g.ourScore as number) > (g.opponentScore as number);
    if ((won ? "win" : "loss") !== result) break;
    length += 1;
  }

  if (length < WIN_LOSS_STREAK_MIN_LENGTH) return null;
  return { result, length };
}

export interface TeamRecentRecord {
  wins: number;
  losses: number;
  sampleSize: number;
}

/**
 * 이 팀의 시즌 전체(모든 상대 포함) 최근 N경기 한정 성적 (기본 5경기).
 * buildMatchupProfile 의 computeMatchupRecentRecord 는 두 팀 맞대결 한정 —
 * "이 팀이 모든 상대 포함 최근 N경기만 보면 몇 승 몇 패인지"는 없던 gap
 * (computeTeamStreak 은 연속 여부만 잡고, 중간에 무승부/스트릭 끊김이 있으면
 * 최근 폼 전체를 못 보여줌). games 는 game_date 내림차순 정렬 전달 (streak 과 동일 계약).
 */
export function computeTeamRecentRecord(
  games: StreakGame[],
): TeamRecentRecord | null {
  const finals = games.filter(
    (g) => g.status === "final" && g.ourScore != null && g.opponentScore != null,
  );
  const recent = finals.slice(0, RECENT_RECORD_WINDOW);
  if (recent.length < RECENT_RECORD_MIN_GAMES) return null;

  let wins = 0;
  let losses = 0;
  for (const g of recent) {
    const our = g.ourScore as number;
    const opp = g.opponentScore as number;
    if (our > opp) wins += 1;
    else if (our < opp) losses += 1;
  }
  return { wins, losses, sampleSize: recent.length };
}

interface PredRow {
  confidence: number | null;
  is_correct: boolean | null;
  predicted_winner: number | null;
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_sp_xfip: number | null;
  away_sp_xfip: number | null;
  home_lineup_woba: number | null;
  away_lineup_woba: number | null;
  home_bullpen_fip: number | null;
  away_bullpen_fip: number | null;
  home_recent_form: number | null;
  away_recent_form: number | null;
  home_elo: number | null;
  away_elo: number | null;
  home_sfr: number | null;
  away_sfr: number | null;
  home_war_total: number | null;
  away_war_total: number | null;
  game: {
    id: number;
    game_date: string;
    status: string | null;
    home_score: number | null;
    away_score: number | null;
    home_team_id: number | null;
    away_team_id: number | null;
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

  // teams select .error 미체크 시 DB 오류에도 teamRow=null silent fallback →
  // 빈 프로필 반환되어 사용자에게 "팀 데이터 없음" 표시 (실제로는 DB 오류).
  // assertSelectOk fail-loud 전환 — error 시 page boundary 가 처리.
  // .maybeSingle() 빈 row 정상 케이스는 data=null 그대로.
  const teamResult = await supabase
    .from("teams")
    .select("id")
    .eq("code", teamCode)
    .maybeSingle();

  const { data: teamRow } = assertSelectOk(teamResult, "buildTeamProfile teams");

  const teamId = (teamRow as { id: number } | null)?.id ?? null;
  if (teamId == null) {
    // Team record 없어도 빈 프로필 반환 (KBO_TEAMS 메타는 있으므로)
    return {
      code: teamCode,
      name: meta.name,
      shortName: shortTeamName(teamCode),
      stadium: meta.stadium,
      parkPf: meta.parkPf,
      parkNote: meta.parkNote,
      predictedGames: 0,
      predictedWins: 0,
      predictedWinRate: null,
      verifiedN: 0,
      correctN: 0,
      accuracyRate: null,
      factorAverages: EMPTY_FACTOR_AVERAGES,
      topPitchers: [],
      recentGames: [],
      streak: null,
      avgMargin: null,
      blowout: null,
      closeGame: null,
      homeAwayEdge: null,
      recentRecord: null,
    };
  }

  // 이 팀이 home 또는 away 인 게임만 SQL 레벨로 필터링.
  // 이전엔 전체 pre_game predictions 풀스캔 후 JS 필터 → 매번 수천 row 가져옴.
  // 이제 games 테이블에서 (home_team_id=teamId OR away_team_id=teamId) 만 select.
  //
  // 기존 `const { data }` 직접 destruct 시 DB 오류에 data=null silent fallback →
  // 빈 recentGames/topPitchers 반환되어 사용자가 "이 팀 데이터 없음" 으로 오해
  // (실제로는 DB 오류). predictions!inner inner-join 정합성 (pre_game 없는 game
  // 의도적 제외) 은 그대로, .error 만 fail-loud 로.
  //
  // scoring_rule 필터 필수 — shadow-cohort.ts 가 매 경기 production(v1.8) row
  // 옆에 shadow(v2.1-B-shadow/v2.0-shadow) row 도 동일 prediction_type='pre_game'
  // 으로 누적 (#1338 family, buildTeamUpcoming.ts/recent/page.tsx 동일 패턴).
  // 필터 없으면 downstream `predictions?.[0]` 이 정렬 보장 없는 임의 row(프로덕션
  // 또는 shadow) 를 집어 팀 적중률/팩터 평균이 shadow 모델 값으로 오염될 수 있음.
  // PRODUCTION_COHORT_RULES(v1.8 + v1.8-credit-fail) 사용 — CURRENT_SCORING_RULE
  // 단일값은 baseline calibration 전용, 이 페이지는 사용자 가시 팀 프로필이라
  // legacy credit-fail production row 도 포함해야 함 (cycle 2409, cycle 2408
  // analysis/game/[id]/page.tsx 동일 정정 계열).
  const gamesResult = await supabase
    .from("games")
    .select(
      `
        id, game_date, status, home_score, away_score,
        home_team_id, away_team_id,
        home_sp:players!games_home_sp_id_fkey(id, name_ko),
        away_sp:players!games_away_sp_id_fkey(id, name_ko),
        home_team:teams!games_home_team_id_fkey(code),
        away_team:teams!games_away_team_id_fkey(code),
        predictions!inner(
          confidence, is_correct, predicted_winner,
          home_sp_fip, away_sp_fip,
          home_sp_xfip, away_sp_xfip,
          home_lineup_woba, away_lineup_woba,
          home_bullpen_fip, away_bullpen_fip,
          home_recent_form, away_recent_form,
          home_elo, away_elo,
          home_sfr, away_sfr,
          home_war_total, away_war_total
        )
      `,
    )
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq("predictions.prediction_type", "pre_game")
    .in("predictions.scoring_rule", PRODUCTION_COHORT_RULES);

  const { data } = assertSelectOk(gamesResult, "buildTeamProfile games");

  type GameRow = NonNullable<PredRow["game"]> & {
    predictions: Array<{
      confidence: number | null;
      is_correct: boolean | null;
      predicted_winner: number | null;
      home_sp_fip: number | null;
      away_sp_fip: number | null;
      home_sp_xfip: number | null;
      away_sp_xfip: number | null;
      home_lineup_woba: number | null;
      away_lineup_woba: number | null;
      home_bullpen_fip: number | null;
      away_bullpen_fip: number | null;
      home_recent_form: number | null;
      away_recent_form: number | null;
      home_elo: number | null;
      away_elo: number | null;
      home_sfr: number | null;
      away_sfr: number | null;
      home_war_total: number | null;
      away_war_total: number | null;
    }>;
  };

  // games rows → PredRow shape 변환 (downstream 코드 변경 최소화)
  const gamesRows = (data ?? []) as unknown as GameRow[];
  const rows: PredRow[] = [];
  for (const g of gamesRows) {
    const pred = g.predictions?.[0];
    if (!pred) continue;
    rows.push({
      confidence: pred.confidence,
      is_correct: pred.is_correct,
      predicted_winner: pred.predicted_winner,
      home_sp_fip: pred.home_sp_fip,
      away_sp_fip: pred.away_sp_fip,
      home_sp_xfip: pred.home_sp_xfip,
      away_sp_xfip: pred.away_sp_xfip,
      home_lineup_woba: pred.home_lineup_woba,
      away_lineup_woba: pred.away_lineup_woba,
      home_bullpen_fip: pred.home_bullpen_fip,
      away_bullpen_fip: pred.away_bullpen_fip,
      home_recent_form: pred.home_recent_form,
      away_recent_form: pred.away_recent_form,
      home_elo: pred.home_elo,
      away_elo: pred.away_elo,
      home_sfr: pred.home_sfr,
      away_sfr: pred.away_sfr,
      home_war_total: pred.home_war_total,
      away_war_total: pred.away_war_total,
      game: {
        id: g.id,
        game_date: g.game_date,
        status: g.status,
        home_score: g.home_score,
        away_score: g.away_score,
        home_team_id: g.home_team_id,
        away_team_id: g.away_team_id,
        home_sp: g.home_sp,
        away_sp: g.away_sp,
        home_team: g.home_team,
        away_team: g.away_team,
      },
    });
  }

  let predictedGames = 0;
  let predictedWins = 0;
  let verifiedN = 0;
  let correctN = 0;

  const factorPerspectives: FactorPerspective[] = [];

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
    const spXfip = isHome ? r.home_sp_xfip : r.away_sp_xfip;
    const woba = isHome ? r.home_lineup_woba : r.away_lineup_woba;
    const bullpen = isHome ? r.home_bullpen_fip : r.away_bullpen_fip;
    const form = isHome ? r.home_recent_form : r.away_recent_form;
    const elo = isHome ? r.home_elo : r.away_elo;
    const sfr = isHome ? r.home_sfr : r.away_sfr;
    const war = isHome ? r.home_war_total : r.away_war_total;

    factorPerspectives.push({
      spFip,
      spXfip,
      lineupWoba: woba,
      bullpenFip: bullpen,
      recentForm: form,
      elo,
      sfr,
      warTotal: war,
    });

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
      opponentName: opponentCode
        ? (shortTeamName(opponentCode))
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

  // 명시적 정렬 — streak/avgMargin/blowout/closeGame/homeAwayEdge/recentRecord 모두
  // teamGames 가 game_date 내림차순이어야 함 (각 함수 docstring 계약). 이전엔 이 정렬이
  // `recentGames` 조립 과정의 `.sort()` in-place mutation 부수효과로만 보장돼 — 아래
  // 문장들의 실행 순서를 바꾸면 (예: recentGames 계산을 뒤로 옮기면) 조용히 깨지는
  // 암묵적 의존이었음 (review-code heavy 감사, cycle 2399). 정렬을 독립 문장으로 분리.
  teamGames.sort((a, b) => b.gameDate.localeCompare(a.gameDate));
  const recentGames = teamGames.slice(0, 8);
  const factorAverages = computeFactorAveragesFromPerspectives(factorPerspectives);
  const streak = computeTeamStreak(teamGames);
  const avgMargin = computeTeamAvgMargin(teamGames);
  const blowout = computeTeamBlowoutCount(teamGames);
  const closeGame = computeTeamCloseGameCount(teamGames);
  const homeAwayEdge = computeTeamHomeAwayEdge(teamGames);
  const recentRecord = computeTeamRecentRecord(teamGames);

  return {
    code: teamCode,
    name: meta.name,
    shortName: shortTeamName(teamCode),
    stadium: meta.stadium,
    parkPf: meta.parkPf,
    parkNote: meta.parkNote,
    predictedGames,
    predictedWins,
    predictedWinRate:
      predictedGames > 0 ? predictedWins / predictedGames : null,
    verifiedN,
    correctN,
    accuracyRate: verifiedN > 0 ? correctN / verifiedN : null,
    factorAverages,
    topPitchers,
    recentGames,
    streak,
    avgMargin,
    blowout,
    closeGame,
    homeAwayEdge,
    recentRecord,
  };
}
