import { createClient } from "@/lib/supabase/server";
import {
  assertSelectOk,
  MATCHUP_UPCOMING_LIMIT,
  MLB_PRODUCTION_COHORT_RULES,
  normalizeMlbTeamCode,
  toKSTDateString,
  toMlbStatsApiCode,
  type MlbTeamCode,
  type SelectResult,
} from "@moneyball/shared";
import type { MlbMatchupPair } from "./mlbCanonicalPair";
import { deriveMlbOutcome } from "./deriveMlbOutcome";

interface MlbMatchupUpcomingGame {
  gameId: number;
  gameDate: string;
  homeCode: MlbTeamCode;
  awayCode: MlbTeamCode;
  homeWinProb: number | null;
  confidence: number | null;
  predictedWinnerCode: MlbTeamCode | null;
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
 * 두 MLB 팀의 예정(scheduled) 맞대결 + pre_game AI 예측. KBO buildMatchupUpcoming.ts
 * 병렬 구현(review-code heavy, cycle 2474) — /mlb/matchup/[teamA]/[teamB] 에 KBO 대응
 * "다음 경기 예측" 섹션이 부재했던 feature parity gap 해소. predicted_winner/confidence
 * 컬럼은 MLB 전량 NULL(buildMlbMatchupProfile.ts 동일 사유) — home_win_prob 로 직접 derive.
 */
export async function buildMlbMatchupUpcoming(
  pair: MlbMatchupPair,
): Promise<MlbMatchupUpcomingGame[]> {
  const supabase = await createClient();

  const dbCodeA = toMlbStatsApiCode(pair.codeA);
  const dbCodeB = toMlbStatsApiCode(pair.codeB);
  const orFilter =
    `and(home_team_code.eq.${dbCodeA},away_team_code.eq.${dbCodeB}),` +
    `and(home_team_code.eq.${dbCodeB},away_team_code.eq.${dbCodeA})`;

  const todayKST = toKSTDateString();

  const scheduleResult = (await supabase
    .from("mlb_schedule")
    .select("id, external_game_id, game_date, home_team_code, away_team_code")
    .eq("status", "scheduled")
    .gte("game_date", todayKST)
    .or(orFilter)
    .order("game_date", { ascending: true })
    .limit(MATCHUP_UPCOMING_LIMIT)) as SelectResult<UpcomingScheduleRow[]>;
  const { data: scheduleData } = assertSelectOk(
    scheduleResult,
    `buildMlbMatchupUpcoming mlb_schedule ${pair.codeA} vs ${pair.codeB}`,
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
    `buildMlbMatchupUpcoming predictions ${pair.codeA} vs ${pair.codeB}`,
  );

  const predByExternalId = new Map<string, PredRow>();
  for (const p of predData ?? []) {
    if (p.external_game_id) predByExternalId.set(p.external_game_id, p);
  }

  const result: MlbMatchupUpcomingGame[] = [];
  for (const g of rows) {
    const homeCode = normalizeMlbTeamCode(g.home_team_code) ?? (g.home_team_code as MlbTeamCode);
    const awayCode = normalizeMlbTeamCode(g.away_team_code) ?? (g.away_team_code as MlbTeamCode);
    const pred = predByExternalId.get(g.external_game_id) ?? null;
    const { predictedHomeWin, confidence } = deriveMlbOutcome({
      homeWinProb: pred?.home_win_prob,
      hasFinalScore: false,
      homeScore: null,
      awayScore: null,
    });
    const predictedWinnerCode: MlbTeamCode | null =
      predictedHomeWin == null ? null : predictedHomeWin ? homeCode : awayCode;

    result.push({
      gameId: g.id,
      gameDate: g.game_date,
      homeCode,
      awayCode,
      homeWinProb: pred?.home_win_prob ?? null,
      confidence,
      predictedWinnerCode,
    });
  }

  return result;
}
