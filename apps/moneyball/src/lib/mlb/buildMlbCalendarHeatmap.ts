import { createClient } from '@/lib/supabase/server';
import { assertSelectOk, MLB_PRODUCTION_COHORT_RULES } from '@moneyball/shared';
import { deriveMlbOutcome } from './deriveMlbOutcome';

// mlb/calendar/page.tsx 전용 — MLB predictions.is_correct 는 전량 NULL(deriveMlbOutcome.ts
// 주석 참조)이라 KBO calendar/page.tsx 처럼 DB row 를 그대로 못 읽고, mlb_schedule(경기 결과) +
// predictions(home_win_prob) 조인 후 날짜별로 derive/집계.

interface MlbCalendarDayAgg {
  total: number;
  verified: number;
  correct: number;
}

interface MlbScheduleRow {
  external_game_id: string;
  game_date: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

interface MlbPredMiniRow {
  external_game_id: string | null;
  home_win_prob: number | null;
}

export async function getMlbMonthHeatmap(
  firstDay: string,
  lastDay: string,
): Promise<Map<string, MlbCalendarDayAgg>> {
  const supabase = await createClient();

  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, game_date, status, home_score, away_score')
    .gte('game_date', firstDay)
    .lte('game_date', lastDay);
  const { data: scheduleData } = assertSelectOk(scheduleResult, 'getMlbMonthHeatmap mlb_schedule');
  const scheduleRows = (scheduleData ?? []) as MlbScheduleRow[];
  if (scheduleRows.length === 0) return new Map();

  const predResult = await supabase
    .from('predictions')
    .select('external_game_id, home_win_prob')
    .eq('prediction_type', 'pre_game')
    .eq('league', 'mlb')
    .in('scoring_rule', MLB_PRODUCTION_COHORT_RULES)
    .in(
      'external_game_id',
      scheduleRows.map((s) => s.external_game_id),
    );
  const { data: predData } = assertSelectOk(predResult, 'getMlbMonthHeatmap predictions');
  const predByExternalId = new Map<string, MlbPredMiniRow>();
  for (const p of (predData ?? []) as MlbPredMiniRow[]) {
    if (p.external_game_id) predByExternalId.set(p.external_game_id, p);
  }

  const byDate = new Map<string, MlbCalendarDayAgg>();
  for (const s of scheduleRows) {
    const pred = predByExternalId.get(s.external_game_id);
    if (!pred) continue;

    const cur = byDate.get(s.game_date) ?? { total: 0, verified: 0, correct: 0 };
    cur.total += 1;

    if (s.status === 'final') {
      const { isCorrect } = deriveMlbOutcome({
        homeWinProb: pred.home_win_prob,
        hasFinalScore: s.home_score != null && s.away_score != null,
        homeScore: s.home_score,
        awayScore: s.away_score,
      });
      if (isCorrect != null) {
        cur.verified += 1;
        if (isCorrect) cur.correct += 1;
      }
    }

    byDate.set(s.game_date, cur);
  }

  return byDate;
}
