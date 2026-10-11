import { createClient } from "@/lib/supabase/server";
import {
  assertSelectOk,
  normalizeMlbTeamCode,
  type MlbTeamCode,
  type SelectResult,
} from "@moneyball/shared";
import { captureFallback } from "@/lib/observability/captureFallback";

// KBO buildTeamEloTrend.ts 병렬 구현 (mlb_team_elo_history, migration 047, 이제 팀 프로필
// 페이지에도 재사용 — 지금까지 matchup 페이지만 소비). KBO 는 buildEloTrend() (전체 30팀
// predictions.home_elo/away_elo) 를 재사용하지만 MLB 는 buildMlbMatchupEloTrend 와 동일하게
// mlb_team_elo_history 를 직접 조회 — canonical 코드 매핑 필요 (사례 27 family).
// avg(리그 평균) 는 KBO 와 동일하게 forward-fill 된 전 팀 최신 Elo 로 계산 (cycle 3033 정정 —
// 이전엔 "그 날짜 실제로 뛴 팀만" 평균내 MLB 의 분산된 일정 탓에 날짜별로 스케줄 구성에 따라
// 평균이 흔들리는 왜곡이 있었음).

export interface MlbTeamEloPoint {
  date: string;
  elo: number;
  avg: number;
}

interface MlbTeamEloTrendData {
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
  let data: EloHistoryRow[] | null;
  try {
    ({ data } = assertSelectOk(result, `buildMlbTeamEloTrend ${code}`));
  } catch (err) {
    data = captureFallback(err, [], { route: '/mlb/team', source: 'buildMlbTeamEloTrend' });
  }
  const rows = data ?? [];
  if (rows.length === 0) return { points: [] };

  const rowsByDate = new Map<string, Array<{ teamCode: MlbTeamCode; elo: number }>>();
  for (const row of rows) {
    const canonicalCode = normalizeMlbTeamCode(row.team_code) ?? (row.team_code as MlbTeamCode);
    const list = rowsByDate.get(row.game_date) ?? [];
    list.push({ teamCode: canonicalCode, elo: row.elo_rating });
    rowsByDate.set(row.game_date, list);
  }

  // 리그 평균 = forward-fill 된 전 팀 최신 Elo 평균 (KBO buildEloTrend.ts 와 동일 패턴).
  // MLB 는 팀마다 경기 일정이 분산돼 있어 "그 날짜 실제로 뛴 팀만" 평균내면 스케줄 노이즈가
  // 섞인 league-average 가 나옴 (사례 27 family 후속, cycle 3033 정정).
  const lastEloByTeam = new Map<MlbTeamCode, number>();
  const points: MlbTeamEloPoint[] = [];

  for (const date of Array.from(rowsByDate.keys()).sort()) {
    const dateRows = rowsByDate.get(date)!;
    for (const { teamCode, elo } of dateRows) {
      lastEloByTeam.set(teamCode, elo);
    }

    const teamElo = dateRows.find((r) => r.teamCode === code)?.elo;
    if (teamElo == null) continue;

    const values = Array.from(lastEloByTeam.values());
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    points.push({ date, elo: teamElo, avg });
  }

  return { points };
}
