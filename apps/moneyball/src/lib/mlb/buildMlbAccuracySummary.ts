import { createClient } from '@/lib/supabase/server';
import { assertSelectOk } from '@moneyball/shared';
import {
  type PredRow,
  type Bucket,
  type ConfidenceTier,
  bucketize,
  brierScore,
  buildConfidenceTiers,
} from '@/lib/accuracy/buildAccuracyData';
import { deriveMlbOutcome } from './deriveMlbOutcome';

export interface MlbAccuracySummary {
  verifiedN: number;
  correctN: number;
  accuracyRate: number | null;
  brier: number | null;
  buckets: Bucket[];
  confidenceTiers: ConfidenceTier[];
}

interface ScheduleFinalRow {
  external_game_id: string;
  game_date: string;
  home_score: number | null;
  away_score: number | null;
}

interface PredMiniRow {
  external_game_id: string | null;
  home_win_prob: number | null;
}

const EMPTY_SUMMARY: MlbAccuracySummary = {
  verifiedN: 0,
  correctN: 0,
  accuracyRate: null,
  brier: null,
  buckets: [],
  confidenceTiers: [],
};

// KBO `predictions.is_correct`/`confidence` 는 DB row 에 이미 채워져 buildAccuracyData
// 함수들이 그대로 읽지만, MLB 는 전량 NULL(deriveMlbOutcome.ts 주석 참조) — 여기서
// home_win_prob + 실제 스코어로 derive 후 동일 PredRow shape 로 매핑해 KBO 와 같은
// bucketize/brierScore/buildConfidenceTiers 를 그대로 재사용(로직 중복 회피).
export async function buildMlbAccuracySummary(locale: 'ko' | 'en' = 'ko'): Promise<MlbAccuracySummary> {
  const supabase = await createClient();

  const scheduleResult = await supabase
    .from('mlb_schedule')
    .select('external_game_id, game_date, home_score, away_score')
    .eq('status', 'final');

  const { data: scheduleData } = assertSelectOk(scheduleResult, 'buildMlbAccuracySummary mlb_schedule');
  const scheduleRows = (scheduleData ?? []) as ScheduleFinalRow[];
  if (scheduleRows.length === 0) return EMPTY_SUMMARY;

  const predResult = await supabase
    .from('predictions')
    .select('external_game_id, home_win_prob')
    .eq('prediction_type', 'pre_game')
    .eq('league', 'mlb')
    .in('external_game_id', scheduleRows.map((s) => s.external_game_id));

  const { data: predData } = assertSelectOk(predResult, 'buildMlbAccuracySummary predictions');
  const predByExternalId = new Map<string, PredMiniRow>();
  for (const p of (predData ?? []) as PredMiniRow[]) {
    if (p.external_game_id) predByExternalId.set(p.external_game_id, p);
  }

  const rows: PredRow[] = [];
  for (const s of scheduleRows) {
    const pred = predByExternalId.get(s.external_game_id);
    if (!pred) continue;

    const { isCorrect, confidence } = deriveMlbOutcome({
      homeWinProb: pred.home_win_prob,
      hasFinalScore: s.home_score != null && s.away_score != null,
      homeScore: s.home_score,
      awayScore: s.away_score,
    });
    if (isCorrect == null || confidence == null) continue;

    rows.push({
      confidence,
      is_correct: isCorrect,
      verified_at: s.game_date,
      homeWinProb: pred.home_win_prob,
    });
  }

  if (rows.length === 0) return EMPTY_SUMMARY;

  const correctN = rows.filter((r) => r.is_correct).length;

  return {
    verifiedN: rows.length,
    correctN,
    accuracyRate: correctN / rows.length,
    brier: brierScore(rows),
    buckets: bucketize(rows),
    confidenceTiers: buildConfidenceTiers(rows, locale),
  };
}
