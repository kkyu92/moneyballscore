'use client';

import useSWR from 'swr';
import { toKSTDateString } from '@moneyball/shared';
import type { LiveScore } from '@/app/api/kbo-scores/route';

interface KboScoresResponse {
  scores: LiveScore[];
  updatedAt: string;
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UseKboScoresOptions {
  /**
   * Optional KST date (`YYYY-MM-DD`). When omitted, polls today's KST date.
   * When provided and the date is **not** today KST (past or future),
   * SWR polling is disabled entirely — historical scores are immutable
   * (server data already has them) and future games haven't started yet,
   * so polling is wasteful. `scores` returns `[]` in that case.
   *
   * Cycle 1021 Tier 1 (A) — enables `predictions/[date]` reuse without
   * spamming Naver's API for archived pages.
   */
  date?: string;
}

export function useKboScores(options: UseKboScoresOptions = {}) {
  const { date } = options;
  const todayKST = toKSTDateString();
  const isToday = date == null || date === todayKST;

  // Only poll when viewing today's schedule. Past/future dates: null key disables SWR.
  const key = isToday
    ? date != null
      ? `/api/kbo-scores?date=${date}`
      : '/api/kbo-scores'
    : null;

  const { data, error, isLoading } = useSWR<KboScoresResponse>(key, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
  });

  const hasLiveGames = data?.scores?.some((s) => s.status === 'live') ?? false;

  return {
    scores: data?.scores ?? [],
    updatedAt: data?.updatedAt,
    error: error || data?.error,
    isLoading: isToday ? isLoading : false,
    hasLiveGames,
    /**
     * Whether SWR polling is active for this hook instance. False when
     * viewing a non-today date (past/future), in which case `scores` is `[]`
     * and consumers should fall back to server-rendered props.
     */
    isPolling: isToday,
  };
}
