import { createClient } from '@/lib/supabase/server';
import { CURRENT_MODEL_FILTER } from '@/config/model';
import {
  assertSelectOk,
  getKSTMondayUtcIso,
  getKSTMonthStartUtcIso,
} from '@moneyball/shared';
import type { AiBaseline, LeaderboardEntry, LeaderboardMode } from './types';

const VIEW_BY_MODE: Record<LeaderboardMode, string> = {
  weekly: 'leaderboard_weekly',
  monthly: 'leaderboard_monthly',
  season: 'leaderboard_season',
  all: 'leaderboard_all',
};

export async function fetchLeaderboard(
  mode: LeaderboardMode,
  limit = 50
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const view = VIEW_BY_MODE[mode];

  const result = await supabase
    .from(view)
    .select('nickname, device_id, total, correct, accuracy_pct, current_streak')
    .limit(limit);

  const { data } = assertSelectOk(result, `leaderboard.fetchLeaderboard(${mode})`);
  return (data ?? []) as LeaderboardEntry[];
}

export async function fetchAiBaseline(mode: LeaderboardMode): Promise<AiBaseline | null> {
  const supabase = await createClient();

  let query = supabase
    .from('predictions')
    .select('is_correct, verified_at')
    .match(CURRENT_MODEL_FILTER)
    .eq('prediction_type', 'pre_game')
    .not('is_correct', 'is', null)
    .not('verified_at', 'is', null);

  // weekly = KST 이번 주 월요일 이후, monthly = KST 이번 달 1일 이후.
  // season / all = 전체 누적 (CURRENT_MODEL_FILTER 가 이미 현 운영 모델만 추출하므로
  // season ≈ all 결과 동일하나 view 측은 명시적 분리).
  if (mode === 'weekly') {
    query = query.gte('verified_at', getKSTMondayUtcIso());
  } else if (mode === 'monthly') {
    query = query.gte('verified_at', getKSTMonthStartUtcIso());
  }

  const result = await query;
  const { data } = assertSelectOk(result, `leaderboard.fetchAiBaseline(${mode})`);
  if (!data) return null;

  const total = data.length;
  if (total === 0) return null;

  const correct = data.filter((r) => r.is_correct === true).length;
  const pct = Math.round((correct / total) * 1000) / 10;
  return { pct, total };
}
