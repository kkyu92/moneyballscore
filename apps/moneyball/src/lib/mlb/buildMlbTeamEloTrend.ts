import { createClient } from "@/lib/supabase/server";
import {
  assertSelectOk,
  normalizeMlbTeamCode,
  type MlbTeamCode,
  type SelectResult,
} from "@moneyball/shared";

// KBO buildTeamEloTrend.ts 병렬 구현 (mlb_team_elo_history, migration 047, 이제 팀 프로필
// 페이지에도 재사용 — 지금까지 matchup 페이지만 소비). KBO 는 buildEloTrend() (전체 30팀
// predictions.home_elo/away_elo) 를 재사용하지만 MLB 는 buildMlbMatchupEloTrend 와 동일하게
// mlb_team_elo_history 를 직접 조회 — canonical 코드 매핑 필요 (사례 27 family).

export interface MlbTeamEloPoint {
  date: string;
  elo: number;
  avg: number;
}

export interface MlbTeamEloTrendData {
  points: MlbTeamEloPoint[];
}

interface EloHistoryRow {
  team_code: string;
  game_date: string;
  elo_rating: number;
}

export async function buildMlbTeamEloTrend(
  code: MlbTeamCode,
): Promise<MlbTeamEloTrendData> {
  const supabase = await createClient();

  const result = (await supabase
    .from("mlb_team_elo_history")
    .select("team_code, game_date, elo_rating")
    .order("game_date", { ascending: true })) as SelectResult<EloHistoryRow[]>;
  const { data } = assertSelectOk(result, `buildMlbTeamEloTrend ${code}`);
  const rows = data ?? [];
  if (rows.length === 0) return { points: [] };

  const byDate = new Map<string, number[]>();
  const teamEloByDate = new Map<string, number>();
  for (const row of rows) {
    const list = byDate.get(row.game_date) ?? [];
    list.push(row.elo_rating);
    byDate.set(row.game_date, list);

    const canonicalCode = normalizeMlbTeamCode(row.team_code) ?? (row.team_code as MlbTeamCode);
    if (canonicalCode === code) teamEloByDate.set(row.game_date, row.elo_rating);
  }

  const points: MlbTeamEloPoint[] = Array.from(teamEloByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, elo]) => {
      const values = byDate.get(date) ?? [];
      const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : elo;
      return { date, elo, avg };
    });

  return { points };
}
