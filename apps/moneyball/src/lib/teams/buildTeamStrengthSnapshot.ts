import { createClient } from '@/lib/supabase/server';
import {
  assertSelectOk,
  KBO_TEAMS,
  shortTeamName,
  type TeamCode,
} from '@moneyball/shared';
import { CURRENT_MODEL_FILTER } from '@/config/model';

export interface TeamStrengthRow {
  teamCode: TeamCode;
  teamName: string;
  elo: number;
  recentForm: number;
  gameDate: string;
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
    .limit(200);

  const { data } = assertSelectOk(result, 'buildTeamStrengthSnapshot');
  if (!data || data.length === 0) return [];

  const rows = data as unknown as SnapshotPredRow[];
  const seen = new Map<string, TeamStrengthRow>();

  for (const row of rows) {
    const homeCode = row.game?.home_team?.code;
    const awayCode = row.game?.away_team?.code;
    const gameDate = row.game?.game_date ?? '';

    if (
      homeCode &&
      !seen.has(homeCode) &&
      row.home_elo != null &&
      row.home_recent_form != null
    ) {
      seen.set(homeCode, {
        teamCode: homeCode as TeamCode,
        teamName: shortTeamName(homeCode as TeamCode),
        elo: row.home_elo,
        recentForm: row.home_recent_form,
        gameDate,
      });
    }

    if (
      awayCode &&
      !seen.has(awayCode) &&
      row.away_elo != null &&
      row.away_recent_form != null
    ) {
      seen.set(awayCode, {
        teamCode: awayCode as TeamCode,
        teamName: shortTeamName(awayCode as TeamCode),
        elo: row.away_elo,
        recentForm: row.away_recent_form,
        gameDate,
      });
    }

    if (seen.size === Object.keys(KBO_TEAMS).length) break;
  }

  return Array.from(seen.values()).sort((a, b) => b.elo - a.elo);
}
