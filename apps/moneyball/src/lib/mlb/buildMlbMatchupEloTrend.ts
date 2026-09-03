import { createClient } from "@/lib/supabase/server";
import {
  assertSelectOk,
  normalizeMlbTeamCode,
  toMlbStatsApiCode,
  type MlbTeamCode,
  type SelectResult,
} from "@moneyball/shared";

// KBO buildMatchupEloTrend.ts 병렬 구현 (plan #25 Phase 2b step 2). KBO 는 predictions.home_elo/
// away_elo 스냅샷을 재사용하지만 MLB 는 전용 mlb_team_elo_history 테이블(migration 047)에서
// 직접 시계열을 읽음 — KBO buildEloTrend 의 forward-fill/downsample 은 불필요(팀당 시즌 최대
// ~162행이라 다운샘플 없이도 recharts 렌더 비용 낮음, cycle 2083 backfill 실측 1,472건/30팀).

export interface MlbMatchupEloPoint {
  date: string;
  eloA: number | null;
  eloB: number | null;
}

interface MlbMatchupEloTrendData {
  points: MlbMatchupEloPoint[];
}

interface EloHistoryRow {
  team_code: string;
  game_date: string;
  elo_rating: number;
}

export async function buildMlbMatchupEloTrend(
  codeA: MlbTeamCode,
  codeB: MlbTeamCode,
): Promise<MlbMatchupEloTrendData> {
  const supabase = await createClient();

  // mlb_team_elo_history 는 mlb_schedule/mlb_team_elo 와 동일하게 StatsAPI 컨벤션 저장 —
  // canonical 코드로 직접 필터링하면 7팀(TBR/CHW/KCR/SDP/SFG/ARI/WSN)에서 항상 0건 매칭
  // (silent empty, cycle 2081 사례 27 재발 방지).
  const dbCodeA = toMlbStatsApiCode(codeA);
  const dbCodeB = toMlbStatsApiCode(codeB);

  const result = (await supabase
    .from("mlb_team_elo_history")
    .select("team_code, game_date, elo_rating")
    .in("team_code", [dbCodeA, dbCodeB])
    .order("game_date", { ascending: true })) as SelectResult<EloHistoryRow[]>;
  const { data } = assertSelectOk(result, `buildMlbMatchupEloTrend ${codeA} vs ${codeB}`);
  const rows = data ?? [];
  if (rows.length === 0) return { points: [] };

  const byDate = new Map<string, { eloA: number | null; eloB: number | null }>();
  for (const row of rows) {
    const canonicalCode = normalizeMlbTeamCode(row.team_code) ?? (row.team_code as MlbTeamCode);
    const entry = byDate.get(row.game_date) ?? { eloA: null, eloB: null };
    if (canonicalCode === codeA) entry.eloA = row.elo_rating;
    else if (canonicalCode === codeB) entry.eloB = row.elo_rating;
    byDate.set(row.game_date, entry);
  }

  const points: MlbMatchupEloPoint[] = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, eloA: v.eloA, eloB: v.eloB }));

  return { points };
}
