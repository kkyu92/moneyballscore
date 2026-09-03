import { createClient } from "@/lib/supabase/server";
import { computeCurrentKSTYear } from "@/lib/seasons/buildSeasonSummary";
import {
  KBO_TEAMS,
  assertSelectOk,
  shortTeamName,
  type SelectResult,
  type TeamCode,
} from "@moneyball/shared";

interface BatterLeaderboardRow {
  playerId: number;
  nameKo: string;
  teamCode: TeamCode | null;
  teamName: string | null;
  teamColor: string | null;
  position: string | null;
  war: number;
  wrcPlus: number;
  ops: number;
  lastSynced: string | null;
}

interface Row {
  war: number | null;
  wrc_plus: number | null;
  ops: number | null;
  last_synced: string | null;
  player: {
    id: number;
    name_ko: string;
    position: string | null;
    team: { code: string | null } | null;
  } | null;
}

/**
 * batter_stats에서 WAR 기준 Top N.
 * position이 'P' (투수)인 경우는 제외 (혹시 섞여 들어간 경우 방어).
 */
export async function buildBatterLeaderboard(options: {
  limit?: number;
  season?: number;
} = {}): Promise<BatterLeaderboardRow[]> {
  const limit = options.limit ?? 10;
  // new Date().getFullYear() 는 서버 로컬(UTC) 기준이라 KST 12/31 15:00~23:59 UTC
  // 구간에 연도가 하루 어긋남 (KST_OFFSET_MS family, cycle 2514 review-code heavy).
  const season = options.season ?? computeCurrentKSTYear();

  const supabase = await createClient();
  // sync-batter-stats 는 Fancy Stats /leaders/ 가 그날 노출한 선수만 upsert —
  // 선수가 leaders 목록에서 빠지면(슬럼프/부상/랭킹 하락) 그 row 는 두 번 다시
  // 갱신되지 않고 DB 에 옛 WAR 값으로 영구 고정됨. freshness 필터 없이 WAR desc
  // 정렬만 하면 수개월 전 값이 현재 1위로 고정 표시되는 실버그(cycle 2733 발견,
  // 송성문 2026-05-29 값이 2026-09-01까지 #1로 노출).
  const FRESHNESS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const freshSince = new Date(Date.now() - FRESHNESS_WINDOW_MS).toISOString();
  // error 시 fail-loud (기존엔 data=null silent fallback → 빈 leaderboard 위장,
  // 사용자엔 "선수 없음" 으로 보임). 호출 site (page) 가 catch 결정.
  const queryResult = (await supabase
    .from("batter_stats")
    .select(
      `
        war, wrc_plus, ops, last_synced,
        player:players!batter_stats_player_id_fkey(
          id, name_ko, position,
          team:teams!players_team_id_fkey(code)
        )
      `,
    )
    .eq("season", season)
    .gte("last_synced", freshSince)
    .order("war", { ascending: false, nullsFirst: false })
    .limit(limit * 2)) as unknown as SelectResult<Row[]>; // position 필터로 일부 제외 대비

  const { data } = assertSelectOk(
    queryResult,
    `buildBatterLeaderboard season=${season}`,
  );
  const rows = (data ?? []) as Row[];
  const result: BatterLeaderboardRow[] = [];

  for (const r of rows) {
    if (!r.player) continue;
    if (r.player.position === "P") continue; // 투수는 타자 리더보드에서 제외
    const teamCode = (r.player.team?.code as TeamCode | null) ?? null;
    const team = teamCode ? KBO_TEAMS[teamCode] : null;
    result.push({
      playerId: r.player.id,
      nameKo: r.player.name_ko,
      teamCode,
      teamName: teamCode ? shortTeamName(teamCode) : null,
      teamColor: team?.color ?? null,
      position: r.player.position,
      war: r.war ?? 0,
      wrcPlus: r.wrc_plus ?? 0,
      ops: r.ops ?? 0,
      lastSynced: r.last_synced,
    });
    if (result.length >= limit) break;
  }

  return result;
}
