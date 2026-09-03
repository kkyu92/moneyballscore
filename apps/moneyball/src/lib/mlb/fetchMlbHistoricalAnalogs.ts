import { createClient } from "@/lib/supabase/server";
import {
  assertSelectOk,
  MLB_PRODUCTION_COHORT_RULES,
  normalizeMlbTeamCode,
  toMlbStatsApiCode,
  ANALOG_MATCHUP_LIMIT,
  type MlbTeamCode,
} from "@moneyball/shared";
import { deriveMlbOutcome } from "./deriveMlbOutcome";

interface MlbAnalogGame {
  externalGameId: string;
  gameDate: string;
  homeCode: MlbTeamCode;
  awayCode: MlbTeamCode;
  homeScore: number | null;
  awayScore: number | null;
  predictedHomeWin: boolean | null;
  isCorrect: boolean | null;
}

interface ScheduleRow {
  external_game_id: string;
  game_date: string;
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
}

interface PredRow {
  external_game_id: string | null;
  home_win_prob: number | null;
}

/**
 * 같은 두 MLB 팀 과거 대결 N건 — KBO `HistoricalAnalogMatchup`(analysis/game/[id]) MLB 버전.
 * mlb_schedule(팀 코드 string) + predictions(external_game_id, league='mlb') 조인.
 * predicted_winner/is_correct 컬럼은 MLB 전량 NULL(deriveMlbOutcome.ts 주석 참조) —
 * home_win_prob + 실제 스코어로 직접 derive(buildMlbMatchupProfile.ts 와 동일 패턴 재사용).
 */
export async function fetchMlbHistoricalAnalogs(
  homeCode: MlbTeamCode,
  awayCode: MlbTeamCode,
  currentExternalGameId: string,
  asOfDate: string,
  limit = ANALOG_MATCHUP_LIMIT,
): Promise<MlbAnalogGame[]> {
  const supabase = await createClient();

  // mlb_schedule 은 StatsAPI 컨벤션 저장 — canonical 코드로 그대로 필터링하면 7팀 alias
  // (TBR/CHW/KCR/SDP/SFG/ARI/WSN) 에서 항상 0건 매칭(buildMlbMatchupProfile.ts 사례 22 재발 차단).
  const dbHome = toMlbStatsApiCode(homeCode);
  const dbAway = toMlbStatsApiCode(awayCode);
  const orFilter =
    `and(home_team_code.eq.${dbHome},away_team_code.eq.${dbAway}),` +
    `and(home_team_code.eq.${dbAway},away_team_code.eq.${dbHome})`;

  const scheduleResult = await supabase
    .from("mlb_schedule")
    .select("external_game_id, game_date, home_team_code, away_team_code, home_score, away_score")
    .or(orFilter)
    .eq("status", "final")
    .lt("game_date", asOfDate)
    .neq("external_game_id", currentExternalGameId)
    .order("game_date", { ascending: false })
    .limit(limit);

  const { data: scheduleData } = assertSelectOk(scheduleResult, "fetchMlbHistoricalAnalogs mlb_schedule");
  const scheduleRows = (scheduleData ?? []) as ScheduleRow[];
  if (scheduleRows.length === 0) return [];

  const predResult = await supabase
    .from("predictions")
    .select("external_game_id, home_win_prob")
    .eq("prediction_type", "pre_game")
    .eq("league", "mlb")
    .in("scoring_rule", MLB_PRODUCTION_COHORT_RULES)
    .in(
      "external_game_id",
      scheduleRows.map((s) => s.external_game_id),
    );

  const { data: predData } = assertSelectOk(predResult, "fetchMlbHistoricalAnalogs predictions");
  const predByExternalId = new Map<string, PredRow>();
  for (const p of (predData ?? []) as PredRow[]) {
    if (p.external_game_id) predByExternalId.set(p.external_game_id, p);
  }

  return scheduleRows.map((s) => {
    const pred = predByExternalId.get(s.external_game_id);
    const hasFinalScore = s.home_score != null && s.away_score != null;
    const { predictedHomeWin, isCorrect } = deriveMlbOutcome({
      homeWinProb: pred?.home_win_prob,
      hasFinalScore,
      homeScore: s.home_score,
      awayScore: s.away_score,
    });
    return {
      externalGameId: s.external_game_id,
      gameDate: s.game_date,
      homeCode: normalizeMlbTeamCode(s.home_team_code) ?? (s.home_team_code as MlbTeamCode),
      awayCode: normalizeMlbTeamCode(s.away_team_code) ?? (s.away_team_code as MlbTeamCode),
      homeScore: s.home_score,
      awayScore: s.away_score,
      predictedHomeWin,
      isCorrect,
    };
  });
}
