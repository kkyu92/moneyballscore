/**
 * cycle 1021 Tier 1 (A) — useKboScores polling gating regression guard.
 * predictions/[date] 아카이브 페이지 재사용 시 과거/미래 날짜는 Naver API
 * polling 차단 (낭비 차단 + Naver 봇 차단 트리거 방지) 검증.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';
import React from 'react';
import { useKboScores } from '@/hooks/use-kbo-scores';
import { toKSTDateString } from '@moneyball/shared';

function wrapper({ children }: { children: ReactNode }) {
  // provider: 매 테스트마다 cache 격리.
  return React.createElement(
    SWRConfig,
    { value: { provider: () => new Map(), dedupingInterval: 0 } },
    children,
  );
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ scores: [], updatedAt: '2026-05-28T12:00:00Z' }),
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useKboScores polling gating', () => {
  it('기본 호출 (date 미지정) — 오늘 KST 로 polling', async () => {
    const { result } = renderHook(() => useKboScores(), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(result.current.isPolling).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/kbo-scores');
  });

  it('오늘 KST date 명시 — polling + date query param 포함', async () => {
    const today = toKSTDateString();
    const { result } = renderHook(() => useKboScores({ date: today }), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(result.current.isPolling).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/kbo-scores?date=${today}`);
  });

  it('과거 date — fetch 호출 자체 차단 + scores = []', async () => {
    const { result } = renderHook(
      () => useKboScores({ date: '2024-01-01' }),
      { wrapper },
    );
    // 작은 task wait — SWR mount cycle 끝나도 fetch 안 됨 확인.
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isPolling).toBe(false);
    expect(result.current.scores).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('미래 date — fetch 호출 자체 차단', async () => {
    const { result } = renderHook(
      () => useKboScores({ date: '2099-12-31' }),
      { wrapper },
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isPolling).toBe(false);
  });
});
