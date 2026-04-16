'use client';

import useSWR from 'swr';
import type { LiveScore } from '@/app/api/kbo-scores/route';

interface KboScoresResponse {
  scores: LiveScore[];
  updatedAt: string;
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useKboScores() {
  const { data, error, isLoading } = useSWR<KboScoresResponse>(
    '/api/kbo-scores',
    fetcher,
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
    },
  );

  const hasLiveGames = data?.scores?.some((s) => s.status === 'live') ?? false;

  return {
    scores: data?.scores ?? [],
    updatedAt: data?.updatedAt,
    error: error || data?.error,
    isLoading,
    hasLiveGames,
  };
}
