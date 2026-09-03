import {
  MLB_PRODUCTION_COHORT_RULES,
  MLB_COMPOSITE_DUEL_MIN_VALID,
  MLB_ANALYSIS_UPCOMING_LIMIT,
  normalizeMlbTeamCode,
  assertSelectOk,
  mlbShortTeamName,
  type MlbTeamCode,
} from '@moneyball/shared';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWeek } from '@/lib/reviews/computeWeekRange';
import { computeMlbCompositeDuel } from '@/lib/analysis/computeMlbCompositeDuel';
import { getYesterdayKSTDateString } from '@/lib/predictions/yesterdayDate';
import { fetchMlbPredictionRowsInRange } from '@/lib/reviews/mlb-shared';

interface MlbAnalysisRow {
  external_game_id: string;
  homeCode: MlbTeamCode;
  awayCode: MlbTeamCode;
  status: string;
  homeWinProb: number;
  winnerCode: MlbTeamCode;
  conf: number;
  /** wave-390 KBO 대응 — 유효 팩터 ≥ MLB_COMPOSITE_DUEL_MIN_VALID(3) 아니면 null */
  duelNetScore: number | null;
  duelValidCount: number;
}

// MLB 예측은 game_id=NULL(migration 038) — games 테이블과의 inner 조인은 KBO 전용이라
// 항상 미스매치(silent 빈 목록, cycle 2114 fix-incident). predictions 를
// mlb_game_date 로 직접 조회 후 mlb_schedule 로 팀 코드 join
// (mlb/games/[date]/page.tsx 와 동일 2-step 패턴, silent drift family fix cycle 1168).
// en/mlb/analysis(cycle 2338, explore-idea heavy) 와 공유 위해 mlb/analysis/page.tsx
// 에서 이 파일로 이동(원래는 page.tsx 로컬 함수 — 중복 로직 방지, DRY).
export async function getTodayMlbAnalysisRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  date: string,
): Promise<MlbAnalysisRow[]> {
  const predResult = await supabase
    .from('predictions')
    .select(`
      external_game_id, home_win_prob,
      home_sp_fip, away_sp_fip, home_sp_xfip, away_sp_xfip,
      home_lineup_woba, away_lineup_woba, home_bullpen_fip, away_bullpen_fip,
      home_war_total, away_war_total
    `)
    .eq('league', 'mlb')
    .eq('prediction_type', 'pre_game')
    .in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)
    .eq('mlb_game_date', date)
    .order('external_game_id', { ascending: true });
  const { data: preds } = assertSelectOk(predResult, 'MlbAnalysis predictions');
  if (!preds || preds.length === 0) return [];

  const gameIds = preds.map((p) => p.external_game_id);
  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, home_team_code, away_team_code, status')
    .in('external_game_id', gameIds);
  const { data: schedules } = assertSelectOk(scheduleResult, 'MlbAnalysis schedule');
  const scheduleByGameId = new Map((schedules ?? []).map((s) => [s.external_game_id, s]));

  const rows: MlbAnalysisRow[] = [];
  for (const p of preds) {
    const schedule = scheduleByGameId.get(p.external_game_id);
    const homeCode = schedule ? normalizeMlbTeamCode(schedule.home_team_code) : undefined;
    const awayCode = schedule ? normalizeMlbTeamCode(schedule.away_team_code) : undefined;
    if (!homeCode || !awayCode) continue;
    const homeWinProb = p.home_win_prob ?? 0.5;

    // wave-390 KBO 대응 — MLB 6팩터(elo/recent_form/head_to_head/sfr 미구현 제외) composite duel.
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

    rows.push({
      external_game_id: p.external_game_id,
      homeCode,
      awayCode,
      status: schedule?.status ?? 'scheduled',
      homeWinProb,
      winnerCode: homeWinProb >= 0.5 ? homeCode : awayCode,
      conf: Math.round((homeWinProb >= 0.5 ? homeWinProb : 1 - homeWinProb) * 100),
      duelNetScore: validEnough ? duel.netScore : null,
      duelValidCount: duel.validCount,
    });
  }
  return rows;
}

interface MlbUpcomingGame {
  external_game_id: string;
  gameDate: string;
  homeCode: MlbTeamCode;
  awayCode: MlbTeamCode;
  winnerCode: MlbTeamCode;
  conf: number;
  duelNetScore: number | null;
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
      winnerCode: homeWinProb >= 0.5 ? homeCode : awayCode,
      conf: Math.round((homeWinProb >= 0.5 ? homeWinProb : 1 - homeWinProb) * 100),
      duelNetScore: validEnough ? duel.netScore : null,
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

interface MlbYesterdayGame {
  external_game_id: string;
  gameDate: string;
  homeCode: MlbTeamCode;
  awayCode: MlbTeamCode;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  predictedWinnerCode: MlbTeamCode | null;
  winnerProb: number;
  isCorrect: boolean | null;
}

// KBO app/analysis/analysis-data.ts getYesterdayGames() MLB 대응 (plan #28 Phase 3,
// cycle 2318). mlb-shared.ts fetchMlbPredictionRowsInRange 재사용 — deriveMlbOutcome
// 별도 구현 금지(mlb-calendar-page.test.ts 가드와 동일 원칙). getYesterdayKSTDateString()
// 은 KBO/MLB 공통 league-agnostic 헬퍼(순수 날짜 계산) 그대로 재사용.
export async function getMlbYesterdayResults(): Promise<MlbYesterdayGame[]> {
  const yesterday = getYesterdayKSTDateString();
  const rows = await fetchMlbPredictionRowsInRange(
    yesterday,
    yesterday,
    'MlbAnalysis getMlbYesterdayResults',
  );
  return rows.map((r) => ({
    external_game_id: r.external_game_id,
    gameDate: r.game_date,
    homeCode: r.home_team_code,
    awayCode: r.away_team_code,
    homeName: mlbShortTeamName(r.home_team_code),
    awayName: mlbShortTeamName(r.away_team_code),
    homeScore: r.home_score,
    awayScore: r.away_score,
    predictedWinnerCode:
      r.predictedHomeWin === null ? null : r.predictedHomeWin ? r.home_team_code : r.away_team_code,
    winnerProb: r.confidence ?? 0.5,
    isCorrect: r.isCorrect,
  }));
}

interface MlbPeriodStats {
  total: number;
  correct: number;
}

// KBO app/analysis/analysis-data.ts getPeriodStats() MLB 대응 — 주간/월간 리뷰 CTA 카드용
// 경량 집계(buildMlbWeeklyReview/buildMlbMonthlyReview 풀 빌더는 teamStats/factorInsights
// 까지 계산해 카드 용도엔 과함, KBO 도 동일 이유로 별도 경량 함수 사용).
export async function getMlbPeriodStats(startDate: string, endDate: string): Promise<MlbPeriodStats> {
  const rows = await fetchMlbPredictionRowsInRange(startDate, endDate, 'MlbAnalysis getMlbPeriodStats');
  const finished = rows.filter((r) => r.isCorrect !== null);
  return {
    total: finished.length,
    correct: finished.filter((r) => r.isCorrect === true).length,
  };
}
