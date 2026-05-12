import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLeaderboard } from '@/lib/leaderboard/use-leaderboard';

const DEVICE_KEY = 'mb_device_id_v1';
const NICKNAME_KEY = 'mb_nickname_v1';
const PICKS_KEY = 'mb_user_picks_v1';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useLeaderboard', () => {
  it('초기 상태 — nickname null, syncState idle', async () => {
    const { result } = renderHook(() => useLeaderboard());
    await waitFor(() => expect(result.current.nickname).toBeNull());
    expect(result.current.syncState).toBe('idle');
    expect(result.current.syncCount).toBe(0);
  });

  it('닉네임 저장된 경우 — 마운트 시 읽어옴', async () => {
    localStorage.setItem(NICKNAME_KEY, 'TestUser');
    const { result } = renderHook(() => useLeaderboard());
    await waitFor(() => expect(result.current.nickname).toBe('TestUser'));
  });

  it('auto-sync — nickname + picks 있으면 마운트 시 sync 호출', async () => {
    localStorage.setItem(NICKNAME_KEY, 'AutoUser');
    localStorage.setItem(DEVICE_KEY, '00000000-0000-0000-0000-000000000001');
    localStorage.setItem(PICKS_KEY, JSON.stringify({
      '42': { pick: 'home', pickedAt: new Date().toISOString() },
    }));

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ synced: 1 }), { status: 200 }),
    );

    renderHook(() => useLeaderboard());
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/leaderboard/sync');
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.nickname).toBe('AutoUser');
    expect(body.picks).toHaveLength(1);
    expect(body.picks[0].game_id).toBe(42);
  });

  it('auto-sync — nickname 없으면 sync 미호출', async () => {
    localStorage.setItem(PICKS_KEY, JSON.stringify({
      '42': { pick: 'home', pickedAt: new Date().toISOString() },
    }));

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 }),
    );

    renderHook(() => useLeaderboard());
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('auto-sync — picks 없으면 sync 미호출', async () => {
    localStorage.setItem(NICKNAME_KEY, 'NoPicksUser');
    localStorage.setItem(DEVICE_KEY, '00000000-0000-0000-0000-000000000002');

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200 }),
    );

    renderHook(() => useLeaderboard());
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
