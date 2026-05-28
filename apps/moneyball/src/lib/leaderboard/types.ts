export interface LeaderboardEntry {
  nickname: string;
  device_id: string;
  total: number;
  correct: number;
  accuracy_pct: number;
  current_streak: number;
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

// cycle 1021 c10: 시즌별 분할 — monthly/season/all 3 mode 신규.
// weekly 는 backward compat 위해 유지 (기존 호출처 점진적 마이그레이션 대비).
export type LeaderboardMode = 'weekly' | 'monthly' | 'season' | 'all';

export interface AiBaseline {
  pct: number;
  total: number;
}
