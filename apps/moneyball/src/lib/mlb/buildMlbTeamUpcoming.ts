import { createClient } from "@/lib/supabase/server";
import {
  assertSelectOk,
  MLB_PRODUCTION_COHORT_RULES,
  TEAM_UPCOMING_LIMIT,
  normalizeMlbTeamCode,
  toKSTDateString,
  toMlbStatsApiCode,
  type MlbTeamCode,
  type SelectResult,
} from "@moneyball/shared";
import { deriveMlbOutcome } from "./deriveMlbOutcome";

interface MlbTeamUpcomingGame {
  gameId: number;
  gameDate: string;
  isHome: boolean;
  opponentCode: MlbTeamCode | null;
  homeWinProb: number | null;
  confidence: number | null;
  predictedAsWinner: boolean;
}

interface UpcomingScheduleRow {
  id: number;
  external_game_id: string;
  game_date: string;
  home_team_code: string;
  away_team_code: string;
}

interface PredRow {
  external_game_id: string | null;
  home_win_prob: number | null;
}

/**
 * MLB 팀 단위 예정(scheduled) 경기 + pre_game AI 예측. KBO buildTeamUpcoming.ts
 * 병렬 구현(review-code heavy, cycle 2475) — /mlb/team/[code] 에 KBO teams/[code]
 * 대응 "예정 경기 · 예측" 섹션이 부재했던 feature parity gap 해소 (matchup 페이지
 * 동일 gap 을 이미 해소한 cycle 2474 buildMlbMatchupUpcoming.ts 와 같은 family).
 * predicted_winner 컬럼은 MLB 전량 NULL — home_win_prob 로 직접 derive.
 */
export async function buildMlbTeamUpcoming(
  teamCode: MlbTeamCode,
): Promise<MlbTeamUpcomingGame[]> {
  const supabase = await createClient();

  const dbTeamCode = toMlbStatsApiCode(teamCode);
  const todayKST = toKSTDateString();

  const scheduleResult = (await supabase
    .from("mlb_schedule")
    .select("id, external_game_id, game_date, home_team_code, away_team_code")
    .eq("status", "scheduled")
    .gte("game_date", todayKST)
    .or(`home_team_code.eq.${dbTeamCode},away_team_code.eq.${dbTeamCode}`)
    .order("game_date", { ascending: true })
    .limit(TEAM_UPCOMING_LIMIT)) as SelectResult<UpcomingScheduleRow[]>;
  const { data: scheduleData } = assertSelectOk(
    scheduleResult,
    `buildMlbTeamUpcoming mlb_schedule ${teamCode}`,
  );
  const rows = scheduleData ?? [];
  if (rows.length === 0) return [];

  const predResult = (await supabase
    .from("predictions")
    .select("external_game_id, home_win_prob")
    .eq("prediction_type", "pre_game")
    .eq("league", "mlb")
    .in("scoring_rule", MLB_PRODUCTION_COHORT_RULES)
    .in(
      "external_game_id",
      rows.map((r) => r.external_game_id),
    )) as SelectResult<PredRow[]>;
  const { data: predData } = assertSelectOk(
    predResult,
    `buildMlbTeamUpcoming predictions ${teamCode}`,
  );

  const predByExternalId = new Map<string, PredRow>();
  for (const p of predData ?? []) {
    if (p.external_game_id) predByExternalId.set(p.external_game_id, p);
  }

  const result: MlbTeamUpcomingGame[] = [];
  for (const g of rows) {
    const isHome = g.home_team_code === dbTeamCode;
    const opponentCode = normalizeMlbTeamCode(isHome ? g.away_team_code : g.home_team_code) ?? null;
    const pred = predByExternalId.get(g.external_game_id) ?? null;
    const { predictedHomeWin, confidence } = deriveMlbOutcome({
      homeWinProb: pred?.home_win_prob,
      hasFinalScore: false,
      homeScore: null,
      awayScore: null,
    });
    const predictedAsWinner =
      predictedHomeWin == null ? false : isHome ? predictedHomeWin : !predictedHomeWin;

    result.push({
      gameId: g.id,
      gameDate: g.game_date,
      isHome,
      opponentCode,
      homeWinProb: pred?.home_win_prob ?? null,
      confidence,
      predictedAsWinner,
    });
  }

  return result;
}
