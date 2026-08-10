import { createClient } from "@/lib/supabase/server";
import { assertSelectOk, type MlbTeamCode } from "@moneyball/shared";

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
  game: {
    home_team_id: number | null;
    away_team_id: number | null;
  } | null;
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

function safeAvg(sum: number, n: number): number | null {
  return n > 0 ? sum / n : null;
}

/**
 * MLB 팀 시즌 평균 팩터값 (선발 FIP / 타선 wOBA / 불펜 FIP / 최근 폼 / Elo / xwOBA / Barrel%).
 * KBO buildTeamFactorAverages.ts 의 MLB 대응 — plan #24 Phase 2a. buildMlbTeamProfile.ts 가
 * 이미 동일 7팩터를 recentGames 쿼리와 함께 계산하지만(inner join predictions), 매치업 페이지는
 * recentGames 없이 팩터 평균만 필요해 별도 가벼운 쿼리로 분리 (KBO buildTeamFactorAverages 와
 * 동일 설계 이유 — buildTeamProfile.ts 대비 별도 존재).
 */
export async function buildMlbTeamFactorAverages(
  teamCode: MlbTeamCode,
): Promise<MlbTeamFactorAverages> {
  const supabase = await createClient();

  const teamResult = await supabase
    .from("teams")
    .select("id")
    .eq("code", teamCode)
    .maybeSingle();
  const { data: teamRow } = assertSelectOk(
    teamResult,
    `buildMlbTeamFactorAverages teams ${teamCode}`,
  );
  const teamId = (teamRow as { id: number } | null)?.id ?? null;
  if (teamId == null) return EMPTY_MLB_FACTOR_AVERAGES;

  const predResult = await supabase
    .from("predictions")
    .select(
      `
        home_sp_fip, away_sp_fip,
        home_lineup_woba, away_lineup_woba,
        home_bullpen_fip, away_bullpen_fip,
        home_recent_form, away_recent_form,
        home_elo, away_elo,
        home_lineup_xwoba, away_lineup_xwoba,
        home_lineup_barrel_pct, away_lineup_barrel_pct,
        prediction_type,
        game:games!inner(home_team_id, away_team_id)
      `,
    )
    .eq("prediction_type", "pre_game")
    .eq("league", "mlb")
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`, {
      foreignTable: "game",
    });

  const { data } = assertSelectOk(
    predResult,
    `buildMlbTeamFactorAverages predictions ${teamCode}`,
  );

  const rows = (data ?? []) as unknown as PredRow[];

  let spFipSum = 0, spFipN = 0;
  let wobaSum = 0, wobaN = 0;
  let bullpenSum = 0, bullpenN = 0;
  let formSum = 0, formN = 0;
  let eloSum = 0, eloN = 0;
  let xwobaSum = 0, xwobaN = 0;
  let barrelSum = 0, barrelN = 0;
  let sampleN = 0;

  for (const r of rows) {
    const g = r.game;
    if (!g) continue;
    const isHome = g.home_team_id === teamId;
    const isAway = g.away_team_id === teamId;
    if (!isHome && !isAway) continue;

    sampleN += 1;
    const spFip = isHome ? r.home_sp_fip : r.away_sp_fip;
    const woba = isHome ? r.home_lineup_woba : r.away_lineup_woba;
    const bullpen = isHome ? r.home_bullpen_fip : r.away_bullpen_fip;
    const form = isHome ? r.home_recent_form : r.away_recent_form;
    const elo = isHome ? r.home_elo : r.away_elo;
    const xwoba = isHome ? r.home_lineup_xwoba : r.away_lineup_xwoba;
    const barrel = isHome ? r.home_lineup_barrel_pct : r.away_lineup_barrel_pct;

    if (spFip != null) {
      spFipSum += spFip;
      spFipN += 1;
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
    if (xwoba != null) {
      xwobaSum += xwoba;
      xwobaN += 1;
    }
    if (barrel != null) {
      barrelSum += barrel;
      barrelN += 1;
    }
  }

  return {
    spFip: safeAvg(spFipSum, spFipN),
    lineupWoba: safeAvg(wobaSum, wobaN),
    bullpenFip: safeAvg(bullpenSum, bullpenN),
    recentForm: safeAvg(formSum, formN),
    elo: safeAvg(eloSum, eloN),
    lineupXwoba: safeAvg(xwobaSum, xwobaN),
    lineupBarrelPct: safeAvg(barrelSum, barrelN),
    sampleN,
  };
}
