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

import { fetchProbablePitchers } from '../statsapi-mlb';

describe('statsapi-mlb.fetchProbablePitchers', () => {
  it('extracts probable pitchers via hydrate', async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dates: [{ games: [{
          gamePk: 745123,
          teams: {
            home: { probablePitcher: { id: 1001, fullName: 'Gerrit Cole' } },
            away: { probablePitcher: { id: 2002, fullName: 'Brayan Bello' } },
          },
        }]}],
      }),
    });

    const pitchers = await fetchProbablePitchers('2026-05-29');
    expect(pitchers).toEqual({
      745123: { home: { id: 1001, name: 'Gerrit Cole' },
                away: { id: 2002, name: 'Brayan Bello' } },
    });
  });

  it('handles missing probable pitchers (D-2 미정)', async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dates: [{ games: [{ gamePk: 745123, teams: { home: {}, away: {} } }]}],
      }),
    });

    const pitchers = await fetchProbablePitchers('2026-05-29');
    expect(pitchers).toEqual({
      745123: { home: null, away: null },
    });
  });
});

import { fetchBoxscore } from '../statsapi-mlb';

describe('statsapi-mlb.fetchBoxscore', () => {
  it('extracts final score + winner', async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        teams: {
          home: { team: { abbreviation: 'NYY' }, teamStats: { batting: { runs: 6 } } },
          away: { team: { abbreviation: 'BOS' }, teamStats: { batting: { runs: 3 } } },
        },
      }),
    });

    const box = await fetchBoxscore(745123);
    expect(box).toEqual({
      gamePk: 745123,
      homeTeam: 'NYY', awayTeam: 'BOS',
      homeScore: 6, awayScore: 3,
      winner: 'NYY',
    });
  });

  it('throws on 404 (game not found)', async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(fetchBoxscore(999999)).rejects.toThrow();
  });
});
