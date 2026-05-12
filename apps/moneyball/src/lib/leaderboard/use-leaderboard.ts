'use client';

import { useCallback, useEffect, useState } from 'react';

const DEVICE_KEY = 'mb_device_id_v1';
const NICKNAME_KEY = 'mb_nickname_v1';
const PICKS_KEY = 'mb_user_picks_v1';

function getOrCreateDeviceId(): string {
  try {
    const stored = localStorage.getItem(DEVICE_KEY);
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function readNickname(): string | null {
  try {
    return localStorage.getItem(NICKNAME_KEY);
  } catch {
    return null;
  }
}

function saveNickname(n: string): void {
  try {
    localStorage.setItem(NICKNAME_KEY, n);
  } catch {}
}

type RawPicks = Record<string, { pick: 'home' | 'away'; pickedAt: string }>;

function readLocalPicks(): Array<{ game_id: number; pick: 'home' | 'away'; picked_at: string }> {
  try {
    const raw = localStorage.getItem(PICKS_KEY);
    if (!raw) return [];
    const parsed: RawPicks = JSON.parse(raw);
    return Object.entries(parsed)
      .filter(([, v]) => v?.pick && v?.pickedAt)
      .map(([id, v]) => ({
        game_id: Number(id),
        pick: v.pick,
        picked_at: v.pickedAt,
      }))
      .filter((p) => !isNaN(p.game_id));
  } catch {
    return [];
  }
}

export type SyncState = 'idle' | 'syncing' | 'done' | 'error';

export interface LeaderboardState {
  deviceId: string;
  nickname: string | null;
  syncState: SyncState;
  syncCount: number;
  join: (nickname: string) => Promise<void>;
}

export function useLeaderboard(): LeaderboardState {
  const [deviceId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return getOrCreateDeviceId();
  });
  const [nickname, setNickname] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return readNickname();
  });
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncCount, setSyncCount] = useState(0);

  useEffect(() => {
    if (!nickname || !deviceId) return;
    // Auto-sync new picks for already-joined users (idempotent — upsert ignores existing)
    const picks = readLocalPicks();
    if (picks.length === 0) return;
    void fetch('/api/leaderboard/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, nickname, picks }),
    }).catch(() => {});
  }, [deviceId, nickname]);

  const join = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (trimmed.length < 2 || trimmed.length > 12) return;
      saveNickname(trimmed);
      setNickname(trimmed);
      setSyncState('syncing');

      const picks = readLocalPicks();
      try {
        const res = await fetch('/api/leaderboard/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: deviceId, nickname: trimmed, picks }),
        });
        const json: { synced?: number; error?: string } = await res.json();
        if (res.ok) {
          setSyncCount(json.synced ?? 0);
          setSyncState('done');
        } else {
          setSyncState('error');
        }
      } catch {
        setSyncState('error');
      }
    },
    [deviceId]
  );

  return { deviceId, nickname, syncState, syncCount, join };
}
