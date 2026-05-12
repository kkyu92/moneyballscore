'use client';

import { useCallback, useEffect, useState } from 'react';

export type PickChoice = 'home' | 'away';

export interface UserPick {
  pick: PickChoice;
  pickedAt: string; // ISO 8601 full datetime
}

export type UserPicksStore = Record<string, UserPick>; // keys are String(gameId)

const STORAGE_KEY = 'mb_user_picks_v1';
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

function readStore(): UserPicksStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as UserPicksStore;
  } catch {
    return {};
  }
}

function writeStore(store: UserPicksStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage full or unavailable — fail silently
  }
}

function pruneExpired(store: UserPicksStore): UserPicksStore {
  const cutoff = Date.now() - EXPIRY_MS;
  const result: UserPicksStore = {};
  for (const [id, pick] of Object.entries(store)) {
    if (new Date(pick.pickedAt).getTime() > cutoff) result[id] = pick;
  }
  return result;
}

export function useUserPicks() {
  const [picks, setPicks] = useState<UserPicksStore>({});

  useEffect(() => {
    const stored = readStore();
    const cleaned = pruneExpired(stored);
    if (Object.keys(cleaned).length !== Object.keys(stored).length) writeStore(cleaned);
    setPicks(cleaned);
  }, []);

  const setPick = useCallback((gameId: number, choice: PickChoice) => {
    setPicks((prev) => {
      const next = {
        ...prev,
        [String(gameId)]: { pick: choice, pickedAt: new Date().toISOString() },
      };
      writeStore(next);
      return next;
    });
  }, []);

  const getPick = useCallback(
    (gameId: number): UserPick | undefined => picks[String(gameId)],
    [picks],
  );

  return { picks, setPick, getPick };
}
