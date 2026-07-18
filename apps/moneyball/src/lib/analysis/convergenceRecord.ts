import { createClient } from '@/lib/supabase/server';
import {
  assertSelectOk,
  toKSTDateString,
  CONVERGENCE_RECORD_LOOKBACK_DAYS,
  CONVERGENCE_RECORD_RECENT_LIMIT,
  COMPOSITE_DUEL_MIN_VALID,
  FACTOR_PICK_MIN_FACTORS,
  PRODUCTION_COHORT_RULES,
  type TeamCode,
  type SelectResult,
} from '@moneyball/shared';
import { computeCompositeDuel } from '@/lib/analysis/computeCompositeDuel';

interface ConvergenceGameRow {
  id: number;
  game_date: string;
  game_time: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team: { code: string | null } | null;
  away_team: { code: string | null } | null;
  predictions: Array<{
    prediction_type: string;
    home_elo: number | null;
    away_elo: number | null;
    home_recent_form: number | null;
    away_recent_form: number | null;
    home_sp_fip: number | null;
    away_sp_fip: number | null;
    home_sp_xfip: number | null;
    away_sp_xfip: number | null;
    home_lineup_woba: number | null;
    away_lineup_woba: number | null;
    home_bullpen_fip: number | null;
    away_bullpen_fip: number | null;
    home_sfr: number | null;
    away_sfr: number | null;
    home_war_total: number | null;
    away_war_total: number | null;
  }>;
}

export async function getRecentConvergencePickRecord(
  limit = CONVERGENCE_RECORD_RECENT_LIMIT,
): Promise<{ wins: number; losses: number; total: number }> {
  const today = toKSTDateString();
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - CONVERGENCE_RECORD_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const gamesResult = (await supabase
    .from('games')
    .select(`
      id, game_date, game_time, home_score, away_score,
      home_team:teams!games_home_team_id_fkey(code),
      away_team:teams!games_away_team_id_fkey(code),
      predictions!inner(
        prediction_type,
        home_elo, away_elo, home_recent_form, away_recent_form,
        home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
        home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip,
        home_sfr, away_sfr, home_war_total, away_war_total
      )
    `)
    .gte('game_date', cutoff)
    .lt('game_date', today)
    .not('home_score', 'is', null)
    .eq('predictions.prediction_type', 'pre_game')
    .in('predictions.scoring_rule', PRODUCTION_COHORT_RULES)
    .order('game_date', { ascending: false })
    .order('game_time', { ascending: true })) as SelectResult<ConvergenceGameRow[]>;

  const { data } = assertSelectOk(gamesResult, 'getRecentConvergencePickRecord');
  if (!data) return { wins: 0, losses: 0, total: 0 };

  let wins = 0, losses = 0, count = 0;
  for (const row of data as unknown as ConvergenceGameRow[]) {
    if (count >= limit) break;
    const pred = row.predictions?.[0];
    if (!pred || row.home_score === null || row.away_score === null) continue;
    const homeCode = row.home_team?.code as TeamCode | undefined;
    const awayCode = row.away_team?.code as TeamCode | undefined;
    if (!homeCode || !awayCode) continue;

    const duel = computeCompositeDuel({
      homeCode,
      homeLineupWoba: pred.home_lineup_woba,
      awayLineupWoba: pred.away_lineup_woba,
      homeSfr: pred.home_sfr,
      awaySfr: pred.away_sfr,
      homeBullpenFip: pred.home_bullpen_fip,
      awayBullpenFip: pred.away_bullpen_fip,
      homeSPFip: pred.home_sp_fip,
      awaySPFip: pred.away_sp_fip,
      homeSPXfip: pred.home_sp_xfip,
      awaySPXfip: pred.away_sp_xfip,
      homeWar: pred.home_war_total,
      awayWar: pred.away_war_total,
      homeElo: pred.home_elo ?? undefined,
      awayElo: pred.away_elo ?? undefined,
      homeRecentForm: pred.home_recent_form ?? undefined,
      awayRecentForm: pred.away_recent_form ?? undefined,
    });

    if (duel.validCount < COMPOSITE_DUEL_MIN_VALID) continue;
    if (Math.abs(duel.netScore) < FACTOR_PICK_MIN_FACTORS) continue;

    const favoredHome = duel.netScore > 0;
    const favWon = favoredHome ? row.home_score > row.away_score : row.away_score > row.home_score;
    if (favWon) wins++; else losses++;
    count++;
  }

  return { wins, losses, total: count };
}
