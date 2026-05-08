import { createClient } from "@/lib/supabase/server";
import {
  KBO_TEAMS,
  assertSelectOk,
  shortTeamName,
  type SelectResult,
  type TeamCode,
} from "@moneyball/shared";

export interface BatterLeaderboardRow {
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
  const season = options.season ?? new Date().getFullYear();

  const supabase = await createClient();
  // assertSelectOk — cycle 173 silent drift family apps/moneyball lib sub-dir
  // 차원 (players) 첫 진입. error 시 fail-loud (기존엔 data=null silent fallback
  // → 빈 leaderboard 위장, 사용자엔 "선수 없음" 으로 보임). 호출 site (page) 가
  // catch 결정.
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
