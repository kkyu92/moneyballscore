import { createClient } from '@/lib/supabase/server';
import {
  assertSelectOk,
  shortTeamName,
  TEAM_STRENGTH_ELO_DELTA_WINDOW,
  TEAM_STRENGTH_SNAPSHOT_LIMIT,
  type TeamCode,
} from '@moneyball/shared';
import { CURRENT_MODEL_FILTER } from '@/config/model';

export interface TeamStrengthRow {
  teamCode: TeamCode;
  teamName: string;
  elo: number;
  recentForm: number;
  gameDate: string;
  /** Elo 변화량 (최근 TEAM_STRENGTH_ELO_DELTA_WINDOW 경기 전 대비). 데이터 부족 시 undefined. */
  eloChange?: number;
}

interface SnapshotPredRow {
  home_elo: number | null;
  away_elo: number | null;
  home_recent_form: number | null;
  away_recent_form: number | null;
  game: {
    game_date: string;
    home_team: { code: string | null } | null;
    away_team: { code: string | null } | null;
  } | null;
}

export async function buildTeamStrengthSnapshot(): Promise<TeamStrengthRow[]> {
  const supabase = await createClient();

  const result = await supabase
    .from('predictions')
    .select(
      `
      home_elo,
      away_elo,
      home_recent_form,
      away_recent_form,
      game:games!predictions_game_id_fkey(
        game_date,
        home_team:teams!games_home_team_id_fkey(code),
        away_team:teams!games_away_team_id_fkey(code)
      )
    `,
    )
    .match(CURRENT_MODEL_FILTER)
    .eq('prediction_type', 'pre_game')
    .not('home_elo', 'is', null)
    .order('created_at', { ascending: false })
    .limit(TEAM_STRENGTH_SNAPSHOT_LIMIT);

  const { data } = assertSelectOk(result, 'buildTeamStrengthSnapshot');
  if (!data || data.length === 0) return [];

  const rows = data as unknown as SnapshotPredRow[];
  const seenCurrent = new Map<string, TeamStrengthRow>();
  const teamCount = new Map<string, number>(); // per-team prediction count (desc order)
  const eloOld = new Map<string, number>(); // Elo at TEAM_STRENGTH_ELO_DELTA_WINDOW games ago

  for (const row of rows) {
    const homeCode = row.game?.home_team?.code;
    const awayCode = row.game?.away_team?.code;
    const gameDate = row.game?.game_date ?? '';

    if (homeCode && row.home_elo != null && row.home_recent_form != null) {
      const cnt = (teamCount.get(homeCode) ?? 0) + 1;
      teamCount.set(homeCode, cnt);

      if (cnt === 1) {
        seenCurrent.set(homeCode, {
          teamCode: homeCode as TeamCode,
          teamName: shortTeamName(homeCode as TeamCode),
          elo: row.home_elo,
          recentForm: row.home_recent_form,
          gameDate,
        });
      } else if (cnt === TEAM_STRENGTH_ELO_DELTA_WINDOW) {
        eloOld.set(homeCode, row.home_elo);
      }
    }

    if (awayCode && row.away_elo != null && row.away_recent_form != null) {
      const cnt = (teamCount.get(awayCode) ?? 0) + 1;
      teamCount.set(awayCode, cnt);

      if (cnt === 1) {
        seenCurrent.set(awayCode, {
          teamCode: awayCode as TeamCode,
          teamName: shortTeamName(awayCode as TeamCode),
          elo: row.away_elo,
          recentForm: row.away_recent_form,
          gameDate,
        });
      } else if (cnt === TEAM_STRENGTH_ELO_DELTA_WINDOW) {
        eloOld.set(awayCode, row.away_elo);
      }
    }
  }

  return Array.from(seenCurrent.values())
    .sort((a, b) => b.elo - a.elo)
    .map((row) => ({
      ...row,
      eloChange: eloOld.has(row.teamCode) ? row.elo - eloOld.get(row.teamCode)! : undefined,
    }));
}
