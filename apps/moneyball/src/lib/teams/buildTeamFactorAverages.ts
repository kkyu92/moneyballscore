import { createClient } from "@/lib/supabase/server";
import { CURRENT_MODEL_FILTER } from "@/config/model";
import {
  assertSelectOk,
  computeFactorAveragesFromPerspectives,
  type FactorPerspective,
  type TeamCode,
} from "@moneyball/shared";

export interface TeamFactorAverages {
  spFip: number | null;
  spXfip: number | null;
  lineupWoba: number | null;
  bullpenFip: number | null;
  recentForm: number | null;
  elo: number | null;
  sfr: number | null;
  warTotal: number | null;
  sampleN: number;
}

interface PredRow {
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
  prediction_type: string | null;
  game: {
    home_team_id: number | null;
    away_team_id: number | null;
  } | null;
}

export const EMPTY_FACTOR_AVERAGES: TeamFactorAverages = {
  spFip: null,
  spXfip: null,
  lineupWoba: null,
  bullpenFip: null,
  recentForm: null,
  elo: null,
  sfr: null,
  warTotal: null,
  sampleN: 0,
};

/**
 * 팀 시즌 평균 팩터값 (선발 FIP/xFIP / 타선 wOBA / 불펜 FIP / 최근 폼 / Elo / SFR / WAR).
 * 매치업 페이지 두 팀 비교 전용 — 별도 쿼리로 팩터 평균만 가볍게 조회.
 * buildTeamProfile.ts 도 동일 8팩터 평균을 필요로 하지만 (topPitchers/recentGames 와
 * 같은 쿼리에서 함께 뽑아내야 해서) 쿼리 자체는 별개 — 평균 계산 로직은 packages/shared
 * 단일 source (computeFactorAveragesFromPerspectives, cycle 2040 review-code heavy).
 */
export async function buildTeamFactorAverages(
  teamCode: TeamCode,
): Promise<TeamFactorAverages> {
  const supabase = await createClient();

  const teamResult = await supabase
    .from("teams")
    .select("id")
    .eq("code", teamCode)
    .maybeSingle();
  const { data: teamRow } = assertSelectOk(
    teamResult,
    `buildTeamFactorAverages teams ${teamCode}`,
  );
  const teamId = (teamRow as { id: number } | null)?.id ?? null;
  if (teamId == null) return EMPTY_FACTOR_AVERAGES;

  const predResult = await supabase
    .from("predictions")
    .select(
      `
        home_sp_fip, away_sp_fip,
        home_sp_xfip, away_sp_xfip,
        home_lineup_woba, away_lineup_woba,
        home_bullpen_fip, away_bullpen_fip,
        home_recent_form, away_recent_form,
        home_elo, away_elo,
        home_sfr, away_sfr,
        home_war_total, away_war_total,
        prediction_type,
        game:games!inner(home_team_id, away_team_id)
      `,
    )
    .match(CURRENT_MODEL_FILTER)
    .eq("prediction_type", "pre_game")
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`, {
      foreignTable: "game",
    });

  const { data } = assertSelectOk(
    predResult,
    `buildTeamFactorAverages predictions ${teamCode}`,
  );

  const rows = (data ?? []) as unknown as PredRow[];

  const perspectives: FactorPerspective[] = [];

  for (const r of rows) {
    const g = r.game;
    if (!g) continue;
    const isHome = g.home_team_id === teamId;
    const isAway = g.away_team_id === teamId;
    if (!isHome && !isAway) continue;

    perspectives.push({
      spFip: isHome ? r.home_sp_fip : r.away_sp_fip,
      spXfip: isHome ? r.home_sp_xfip : r.away_sp_xfip,
      lineupWoba: isHome ? r.home_lineup_woba : r.away_lineup_woba,
      bullpenFip: isHome ? r.home_bullpen_fip : r.away_bullpen_fip,
      recentForm: isHome ? r.home_recent_form : r.away_recent_form,
      elo: isHome ? r.home_elo : r.away_elo,
      sfr: isHome ? r.home_sfr : r.away_sfr,
      warTotal: isHome ? r.home_war_total : r.away_war_total,
    });
  }

  return computeFactorAveragesFromPerspectives(perspectives);
}
