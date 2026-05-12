import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserPicks } from '@/hooks/use-user-picks';

const STORAGE_KEY = 'mb_user_picks_v1';

beforeEach(() => {
  localStorage.clear();
});

describe('useUserPicks', () => {
  it('초기 상태 — localStorage 비어 있으면 picks = {}', async () => {
    const { result } = renderHook(() => useUserPicks());
    // wait for useEffect
    await act(async () => {});
    expect(result.current.picks).toEqual({});
  });

  it('setPick — home 선택 후 localStorage 저장', async () => {
    const { result } = renderHook(() => useUserPicks());
    await act(async () => {});

    act(() => { result.current.setPick(42, 'home'); });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored['42'].pick).toBe('home');
    expect(stored['42'].pickedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('setPick — away 선택 후 pick 덮어쓰기', async () => {
    const { result } = renderHook(() => useUserPicks());
    await act(async () => {});

    act(() => { result.current.setPick(42, 'home'); });
    act(() => { result.current.setPick(42, 'away'); });
    expect(result.current.getPick(42)?.pick).toBe('away');
  });

  it('getPick — 없는 gameId → undefined', async () => {
    const { result } = renderHook(() => useUserPicks());
    await act(async () => {});
    expect(result.current.getPick(999)).toBeUndefined();
  });

  it('gameId 키는 항상 string — JSON.parse 후 일치', async () => {
    const { result } = renderHook(() => useUserPicks());
    await act(async () => {});

    act(() => { result.current.setPick(1, 'home'); });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    // JSON.parse는 모든 키를 string으로 반환 — '1' 키로 저장되어야 함
    expect(Object.keys(stored)[0]).toBe('1');
  });

  it('만료된 픽 정리 — 31일 지난 픽은 마운트 시 제거', async () => {
    const old: Record<string, unknown> = {
      '10': {
        pick: 'home',
        pickedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      },
      '20': {
        pick: 'away',
        pickedAt: new Date().toISOString(),
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(old));

    const { result } = renderHook(() => useUserPicks());
    await act(async () => {});

    expect(result.current.picks['10']).toBeUndefined();
    expect(result.current.picks['20']).toBeDefined();
  });

  it('localStorage 손상 JSON — 빈 picks 반환 (no throw)', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{{{');
    const { result } = renderHook(() => useUserPicks());
    await act(async () => {});
    expect(result.current.picks).toEqual({});
  });

  it('여러 경기 픽 — 독립적으로 저장', async () => {
    const { result } = renderHook(() => useUserPicks());
    await act(async () => {});

    act(() => {
      result.current.setPick(1, 'home');
      result.current.setPick(2, 'away');
      result.current.setPick(3, 'home');
    });
    expect(result.current.getPick(1)?.pick).toBe('home');
    expect(result.current.getPick(2)?.pick).toBe('away');
    expect(result.current.getPick(3)?.pick).toBe('home');
  });
});
