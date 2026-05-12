import { createClient } from '@/lib/supabase/server';
import type { LeaderboardEntry, LeaderboardMode } from './types';

export async function fetchLeaderboard(
  mode: LeaderboardMode,
  limit = 50
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const view = mode === 'weekly' ? 'leaderboard_weekly' : 'leaderboard_season';

  const { data, error } = await supabase
    .from(view)
    .select('nickname, device_id, total, correct, accuracy_pct')
    .limit(limit);

  if (error) return [];
  return (data ?? []) as LeaderboardEntry[];
}
