export interface LeaderboardEntry {
  nickname: string;
  device_id: string;
  total: number;
  correct: number;
  accuracy_pct: number;
}

export interface LeaderboardSyncPayload {
  device_id: string;
  nickname: string;
  picks: Array<{
    game_id: number;
    pick: 'home' | 'away';
    picked_at: string;
  }>;
}

export type LeaderboardMode = 'weekly' | 'season';
