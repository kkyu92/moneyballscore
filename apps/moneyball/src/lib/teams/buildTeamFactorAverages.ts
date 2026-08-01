import { createClient } from "@/lib/supabase/server";
import { assertSelectOk, type TeamCode } from "@moneyball/shared";

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

function safeAvg(sum: number, n: number): number | null {
  return n > 0 ? sum / n : null;
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
 * buildTeamProfile.ts 도 동일 8팩터 평균을 자체 계산하지만 (topPitchers/recentGames
 * 와 같은 쿼리에서 함께 뽑아내야 해서) 별개 구현 유지 — TeamFactorAverages 타입만 공유.
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
    .eq("prediction_type", "pre_game")
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`, {
      foreignTable: "game",
    });

  const { data } = assertSelectOk(
    predResult,
    `buildTeamFactorAverages predictions ${teamCode}`,
  );

  const rows = (data ?? []) as unknown as PredRow[];

  let spFipSum = 0;
  let spFipN = 0;
  let spXfipSum = 0;
  let spXfipN = 0;
  let wobaSum = 0;
  let wobaN = 0;
  let bullpenSum = 0;
  let bullpenN = 0;
  let formSum = 0;
  let formN = 0;
  let eloSum = 0;
  let eloN = 0;
  let sfrSum = 0;
  let sfrN = 0;
  let warSum = 0;
  let warN = 0;
  let sampleN = 0;

  for (const r of rows) {
    const g = r.game;
    if (!g) continue;
    const isHome = g.home_team_id === teamId;
    const isAway = g.away_team_id === teamId;
    if (!isHome && !isAway) continue;
    sampleN += 1;

    const spFip = isHome ? r.home_sp_fip : r.away_sp_fip;
    const spXfip = isHome ? r.home_sp_xfip : r.away_sp_xfip;
    const woba = isHome ? r.home_lineup_woba : r.away_lineup_woba;
    const bullpen = isHome ? r.home_bullpen_fip : r.away_bullpen_fip;
    const form = isHome ? r.home_recent_form : r.away_recent_form;
    const elo = isHome ? r.home_elo : r.away_elo;
    const sfr = isHome ? r.home_sfr : r.away_sfr;
    const war = isHome ? r.home_war_total : r.away_war_total;

    if (spFip != null) {
      spFipSum += spFip;
      spFipN += 1;
    }
    if (spXfip != null) {
      spXfipSum += spXfip;
      spXfipN += 1;
    }
    if (woba != null) {
      wobaSum += woba;
      wobaN += 1;
    }
    if (bullpen != null) {
      bullpenSum += bullpen;
      bullpenN += 1;
    }
    if (form != null) {
      formSum += form;
      formN += 1;
    }
    if (elo != null) {
      eloSum += elo;
      eloN += 1;
    }
    if (sfr != null) {
      sfrSum += sfr;
      sfrN += 1;
    }
    if (war != null) {
      warSum += war;
      warN += 1;
    }
  }

  return {
    spFip: safeAvg(spFipSum, spFipN),
    spXfip: safeAvg(spXfipSum, spXfipN),
    lineupWoba: safeAvg(wobaSum, wobaN),
    bullpenFip: safeAvg(bullpenSum, bullpenN),
    recentForm: safeAvg(formSum, formN),
    elo: safeAvg(eloSum, eloN),
    sfr: safeAvg(sfrSum, sfrN),
    warTotal: safeAvg(warSum, warN),
    sampleN,
  };
}
