'use client';

import { useCallback, useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { NICKNAME_MIN_CHARS, NICKNAME_MAX_CHARS } from '@moneyball/shared';

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

const MLB_KEY_PREFIX = 'mlb-';

// PickButton.tsx 가 MLB 픽을 `mlb-${externalGameId}` 로 네임스페이스 저장 (KBO 정수
// game_id 와 값 공간 충돌 방지) — 이 접두어만 골라 external_game_id 로 복원.
function readLocalMlbPicks(): Array<{ external_game_id: string; pick: 'home' | 'away'; picked_at: string }> {
  try {
    const raw = localStorage.getItem(PICKS_KEY);
    if (!raw) return [];
    const parsed: RawPicks = JSON.parse(raw);
    return Object.entries(parsed)
      .filter(([id, v]) => id.startsWith(MLB_KEY_PREFIX) && v?.pick && v?.pickedAt)
      .map(([id, v]) => ({
        external_game_id: id.slice(MLB_KEY_PREFIX.length),
        pick: v.pick,
        picked_at: v.pickedAt,
      }));
  } catch {
    return [];
  }
}

type SyncState = 'idle' | 'syncing' | 'done' | 'error';

interface LeaderboardState {
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
    if (picks.length > 0) {
      void fetch('/api/leaderboard/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, nickname, picks }),
      }).catch((err) => {
        Sentry.captureException(err, {
          tags: { silent_drift_family: 'wave_166', component: 'use-leaderboard', op: 'leaderboard_auto_sync' },
        });
      });
    }
    const mlbPicks = readLocalMlbPicks();
    if (mlbPicks.length > 0) {
      void fetch('/api/leaderboard/mlb-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, nickname, picks: mlbPicks }),
      }).catch((err) => {
        Sentry.captureException(err, {
          tags: { silent_drift_family: 'wave_166', component: 'use-leaderboard', op: 'leaderboard_mlb_auto_sync' },
        });
      });
    }
  }, [deviceId, nickname]);

  const join = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (trimmed.length < NICKNAME_MIN_CHARS || trimmed.length > NICKNAME_MAX_CHARS) return;
      saveNickname(trimmed);
      setNickname(trimmed);
      setSyncState('syncing');

      const picks = readLocalPicks();
      const mlbPicks = readLocalMlbPicks();
      try {
        const [res, mlbRes] = await Promise.all([
          fetch('/api/leaderboard/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_id: deviceId, nickname: trimmed, picks }),
          }),
          mlbPicks.length > 0
            ? fetch('/api/leaderboard/mlb-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_id: deviceId, nickname: trimmed, picks: mlbPicks }),
              })
            : null,
        ]);
        const json: { synced?: number; error?: string } = await res.json();
        if (!res.ok) {
          setSyncState('error');
          return;
        }
        let total = json.synced ?? 0;
        if (mlbRes) {
          const mlbJson: { synced?: number; error?: string } = await mlbRes.json();
          if (mlbRes.ok) total += mlbJson.synced ?? 0;
        }
        setSyncCount(total);
        setSyncState('done');
      } catch (err) {
        Sentry.captureException(err, {
          tags: { silent_drift_family: 'wave_173', component: 'use-leaderboard', op: 'leaderboard_join_sync' },
        });
        setSyncState('error');
      }
    },
    [deviceId]
  );

  return { deviceId, nickname, syncState, syncCount, join };
}
