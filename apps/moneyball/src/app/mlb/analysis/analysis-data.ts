import {
  MLB_PRODUCTION_COHORT_RULES,
  MLB_COMPOSITE_DUEL_MIN_VALID,
  MLB_ANALYSIS_UPCOMING_LIMIT,
  normalizeMlbTeamCode,
  assertSelectOk,
  type MlbTeamCode,
} from '@moneyball/shared';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWeek } from '@/lib/reviews/computeWeekRange';
import { computeMlbCompositeDuel } from '@/lib/analysis/computeMlbCompositeDuel';

export interface MlbUpcomingGame {
  external_game_id: string;
  gameDate: string;
  homeCode: MlbTeamCode;
  awayCode: MlbTeamCode;
  homeWinProb: number;
  winnerCode: MlbTeamCode;
  conf: number;
  duelNetScore: number | null;
  duelValidCount: number;
}

interface UpcomingPredRow {
  external_game_id: string;
  mlb_game_date: string;
  home_win_prob: number | null;
  home_sp_fip: number | null;
  away_sp_fip: number | null;
  home_sp_xfip: number | null;
  away_sp_xfip: number | null;
  home_lineup_woba: number | null;
  away_lineup_woba: number | null;
  home_bullpen_fip: number | null;
  away_bullpen_fip: number | null;
  home_war_total: number | null;
  away_war_total: number | null;
}

// KBO app/analysis/analysis-data.ts 의 getThisWeekRemainingGames() MLB 대응
// (plan #28 Phase 2, cycle 2316). KBO 는 games 테이블 inner join 단일 쿼리지만 MLB
// 예측은 game_id=NULL(migration 038) 이라 mlb/analysis/page.tsx getTodayMlbAnalysisRows()
// 와 동일한 2-step 패턴(predictions → mlb_schedule) 재사용 필수 (cycle 2114/1168
// silent drift family 재발 방지).
export async function getMlbThisWeekRemainingGames(
  today: string,
): Promise<MlbUpcomingGame[]> {
  const currentWeek = getCurrentWeek();
  if (currentWeek.endDate <= today) return [];

  const tomorrowDate = new Date(`${today}T12:00:00Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);
  if (tomorrow > currentWeek.endDate) return [];

  const supabase = await createClient();
  const predResult = await supabase
    .from('predictions')
    .select(`
      external_game_id, mlb_game_date, home_win_prob,
      home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
      home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip,
      home_war_total, away_war_total
    `)
    .eq('league', 'mlb')
    .eq('prediction_type', 'pre_game')
    .in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)
    .gte('mlb_game_date', tomorrow)
    .lte('mlb_game_date', currentWeek.endDate)
    .order('mlb_game_date', { ascending: true })
    .order('external_game_id', { ascending: true })
    .limit(MLB_ANALYSIS_UPCOMING_LIMIT);
  const { data: preds } = assertSelectOk(predResult, 'MlbAnalysis getMlbThisWeekRemainingGames');
  if (!preds || preds.length === 0) return [];

  const rows = preds as unknown as UpcomingPredRow[];
  const gameIds = rows.map((p) => p.external_game_id);
  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, home_team_code, away_team_code')
    .in('external_game_id', gameIds);
  const { data: schedules } = assertSelectOk(scheduleResult, 'MlbAnalysis getMlbThisWeekRemainingGames schedule');
  const scheduleByGameId = new Map((schedules ?? []).map((s) => [s.external_game_id, s]));

  const games: MlbUpcomingGame[] = [];
  for (const p of rows) {
    const schedule = scheduleByGameId.get(p.external_game_id);
    const homeCode = schedule ? normalizeMlbTeamCode(schedule.home_team_code) : undefined;
    const awayCode = schedule ? normalizeMlbTeamCode(schedule.away_team_code) : undefined;
    if (!homeCode || !awayCode) continue;
    const homeWinProb = p.home_win_prob ?? 0.5;

    const duel = computeMlbCompositeDuel({
      homeCode,
      homeLineupWoba: p.home_lineup_woba,
      awayLineupWoba: p.away_lineup_woba,
      homeBullpenFip: p.home_bullpen_fip,
      awayBullpenFip: p.away_bullpen_fip,
      homeSPFip: p.home_sp_fip,
      awaySPFip: p.away_sp_fip,
      homeSPXfip: p.home_sp_xfip,
      awaySPXfip: p.away_sp_xfip,
      homeWar: p.home_war_total,
      awayWar: p.away_war_total,
    });
    const validEnough = duel.validCount >= MLB_COMPOSITE_DUEL_MIN_VALID;

    games.push({
      external_game_id: p.external_game_id,
      gameDate: p.mlb_game_date,
      homeCode,
      awayCode,
      homeWinProb,
      winnerCode: homeWinProb >= 0.5 ? homeCode : awayCode,
      conf: Math.round((homeWinProb >= 0.5 ? homeWinProb : 1 - homeWinProb) * 100),
      duelNetScore: validEnough ? duel.netScore : null,
      duelValidCount: duel.validCount,
    });
  }
  return games;
}

export function groupMlbGamesByDate(games: MlbUpcomingGame[]): Map<string, MlbUpcomingGame[]> {
  const grouped = new Map<string, MlbUpcomingGame[]>();
  for (const g of games) {
    const list = grouped.get(g.gameDate) ?? [];
    list.push(g);
    grouped.set(g.gameDate, list);
  }
  return grouped;
}
