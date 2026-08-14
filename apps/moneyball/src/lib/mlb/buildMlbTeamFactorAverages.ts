import { createClient } from "@/lib/supabase/server";
import {
  assertSelectOk,
  computeNumericAveragesFromPerspectives,
  toMlbStatsApiCode,
  MLB_PRODUCTION_COHORT_RULES,
  type MlbTeamCode,
} from "@moneyball/shared";

export interface MlbTeamFactorAverages {
  spFip: number | null;
  lineupWoba: number | null;
  bullpenFip: number | null;
  recentForm: number | null;
  elo: number | null;
  lineupXwoba: number | null;
  lineupBarrelPct: number | null;
  sampleN: number;
}

interface PredRow {
  external_game_id: string | null;
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
  prediction_type: string | null;
}

interface ScheduleRow {
  external_game_id: string;
  home_team_code: string;
  away_team_code: string;
}

export const EMPTY_MLB_FACTOR_AVERAGES: MlbTeamFactorAverages = {
  spFip: null,
  lineupWoba: null,
  bullpenFip: null,
  recentForm: null,
  elo: null,
  lineupXwoba: null,
  lineupBarrelPct: null,
  sampleN: 0,
};

type MlbFactorPerspective = Omit<MlbTeamFactorAverages, "sampleN">;

const MLB_FACTOR_FIELDS = [
  "spFip",
  "lineupWoba",
  "bullpenFip",
  "recentForm",
  "elo",
  "lineupXwoba",
  "lineupBarrelPct",
] as const satisfies readonly (keyof MlbFactorPerspective)[];

/**
 * MLB 팀 시즌 평균 팩터값 (선발 FIP / 타선 wOBA / 불펜 FIP / 최근 폼 / Elo / xwOBA / Barrel%).
 * KBO buildTeamFactorAverages.ts 의 MLB 대응 — plan #24 Phase 2a. buildMlbTeamProfile.ts 가
 * 이미 동일 7팩터를 recentGames 쿼리와 함께 계산하지만, 매치업 페이지는 recentGames 없이
 * 팩터 평균만 필요해 별도 가벼운 쿼리로 분리 (KBO buildTeamFactorAverages 와 동일 설계 이유).
 * sum/count 누적 자체는 packages/shared 단일 source (computeNumericAveragesFromPerspectives)
 * — cycle 2064 review-code heavy, KBO computeFactorAveragesFromPerspectives 과 독립 중복
 * (필드셋 다름) 통합.
 *
 * cycle 2066 fix (사례 22 후속) — `teams`/`games` 는 MLB row 가 0건이라 항상 빈 값을 냈음
 * (teams FK lookup 이 항상 null). MLB 는 `mlb_schedule`(팀 코드 string) + `predictions`
 * (`external_game_id`, `league='mlb'`) 로만 실제 기록됨 — mlb-pipeline.ts 가 쓰는 것과
 * 동일한 두 쿼리로 교체.
 */
export async function buildMlbTeamFactorAverages(
  teamCode: MlbTeamCode,
): Promise<MlbTeamFactorAverages> {
  const supabase = await createClient();

  // mlb_schedule 은 StatsAPI 컨벤션 저장 — canonical(Baseball-Reference) 코드로 그대로 필터링하면
  // 7팀(TBR/CHW/KCR/SDP/SFG/ARI/WSN)에서 항상 0건 매칭(silent empty, cycle 2081).
  const dbTeamCode = toMlbStatsApiCode(teamCode);
  const scheduleResult = await supabase
    .from("mlb_schedule")
    .select("external_game_id, home_team_code, away_team_code")
    .or(`home_team_code.eq.${dbTeamCode},away_team_code.eq.${dbTeamCode}`);
  const { data: scheduleData } = assertSelectOk(
    scheduleResult,
    `buildMlbTeamFactorAverages mlb_schedule ${teamCode}`,
  );
  const scheduleRows = (scheduleData ?? []) as ScheduleRow[];
  if (scheduleRows.length === 0) return EMPTY_MLB_FACTOR_AVERAGES;

  const scheduleByExternalId = new Map<string, ScheduleRow>();
  for (const s of scheduleRows) {
    scheduleByExternalId.set(s.external_game_id, s);
  }

  const predResult = await supabase
    .from("predictions")
    .select(
      `
        external_game_id,
        home_sp_fip, away_sp_fip,
        home_lineup_woba, away_lineup_woba,
        home_bullpen_fip, away_bullpen_fip,
        home_recent_form, away_recent_form,
        home_elo, away_elo,
        home_lineup_xwoba, away_lineup_xwoba,
        home_lineup_barrel_pct, away_lineup_barrel_pct,
        prediction_type
      `,
    )
    .eq("prediction_type", "pre_game")
    .eq("league", "mlb")
    .in("scoring_rule", MLB_PRODUCTION_COHORT_RULES)
    .in("external_game_id", Array.from(scheduleByExternalId.keys()));

  const { data } = assertSelectOk(
    predResult,
    `buildMlbTeamFactorAverages predictions ${teamCode}`,
  );

  const rows = (data ?? []) as unknown as PredRow[];

  const perspectives: MlbFactorPerspective[] = [];
  for (const r of rows) {
    if (!r.external_game_id) continue;
    const s = scheduleByExternalId.get(r.external_game_id);
    if (!s) continue;
    const isHome = s.home_team_code === dbTeamCode;
    const isAway = s.away_team_code === dbTeamCode;
    if (!isHome && !isAway) continue;

    perspectives.push({
      spFip: isHome ? r.home_sp_fip : r.away_sp_fip,
      lineupWoba: isHome ? r.home_lineup_woba : r.away_lineup_woba,
      bullpenFip: isHome ? r.home_bullpen_fip : r.away_bullpen_fip,
      recentForm: isHome ? r.home_recent_form : r.away_recent_form,
      elo: isHome ? r.home_elo : r.away_elo,
      lineupXwoba: isHome ? r.home_lineup_xwoba : r.away_lineup_xwoba,
      lineupBarrelPct: isHome
        ? r.home_lineup_barrel_pct
        : r.away_lineup_barrel_pct,
    });
  }

  return computeNumericAveragesFromPerspectives(perspectives, MLB_FACTOR_FIELDS);
}
