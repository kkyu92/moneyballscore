import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMlbSchedule } from '../statsapi-mlb';

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

global.fetch = vi.fn();

beforeEach(() => {
  vi.mocked(global.fetch as any).mockReset();
});

describe('statsapi-mlb.fetchMlbSchedule', () => {
  it('parses schedule for date with games', async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dates: [{ date: '2026-05-29', games: [
          { gamePk: 745123, gameDate: '2026-05-29T23:05:00Z',
            teams: {
              home: { team: { abbreviation: 'NYY' }, score: undefined },
              away: { team: { abbreviation: 'BOS' }, score: undefined },
            },
            status: { detailedState: 'Scheduled' } },
        ]}],
      }),
    });

    const games = await fetchMlbSchedule('2026-05-29');
    expect(games).toHaveLength(1);
    expect(games[0].gamePk).toBe(745123);
    expect(games[0].homeTeam).toBe('NYY');
    expect(games[0].awayTeam).toBe('BOS');
    expect(games[0].gameDateUtc).toEqual(new Date('2026-05-29T23:05:00Z'));
    expect(games[0].status).toBe('scheduled');
  });

  it('returns empty array for date with no games', async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ dates: [] }),
    });

    const games = await fetchMlbSchedule('2026-05-29');
    expect(games).toEqual([]);
  });

  it('retries on rate limit (429) with exponential backoff', async () => {
    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ dates: [] }) });

    const games = await fetchMlbSchedule('2026-05-29');
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(games).toEqual([]);
  }, 60000);

  it('throws after 3 retries', async () => {
    vi.mocked(global.fetch as any).mockResolvedValue({ ok: false, status: 429 });
    await expect(fetchMlbSchedule('2026-05-29')).rejects.toThrow(/rate limit/);
  }, 60000);

  it('returns empty array on 403 (ToS enforcement 적발) silent', async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({ ok: false, status: 403 });
    const games = await fetchMlbSchedule('2026-05-29');
    expect(games).toEqual([]);
  });
});
