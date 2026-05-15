import { createClient } from '@/lib/supabase/server';
import { CURRENT_MODEL_FILTER } from '@/config/model';
import { assertSelectOk } from '@moneyball/shared';
import type { AiBaseline, LeaderboardEntry, LeaderboardMode } from './types';

export async function fetchLeaderboard(
  mode: LeaderboardMode,
  limit = 50
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const view = mode === 'weekly' ? 'leaderboard_weekly' : 'leaderboard_season';

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

  if (mode === 'weekly') {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const dow = kst.getUTCDay();
    const mondayOffset = dow === 0 ? 6 : dow - 1;
    const monday = new Date(kst);
    monday.setUTCDate(monday.getUTCDate() - mondayOffset);
    monday.setUTCHours(0, 0, 0, 0);
    const mondayUtc = new Date(monday.getTime() - 9 * 60 * 60 * 1000);
    query = query.gte('verified_at', mondayUtc.toISOString());
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
