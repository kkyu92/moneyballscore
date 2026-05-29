import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRetrosheetSeasonGames, RETROSHEET_ATTRIBUTION } from '../mlb-historical-bootstrap';

global.fetch = vi.fn();

beforeEach(() => {
  vi.mocked(global.fetch as any).mockReset();
});

describe('mlb-historical-bootstrap', () => {
  it('RETROSHEET_ATTRIBUTION matches required license text', () => {
    expect(RETROSHEET_ATTRIBUTION).toContain('Retrosheet');
    expect(RETROSHEET_ATTRIBUTION).toContain('www.retrosheet.org');
    expect(RETROSHEET_ATTRIBUTION).toContain('free of charge');
  });

  it('parses Retrosheet game log CSV', async () => {
    const csv = `"20240328","0","Fri","NYY","AL","1","BOS","AL","1","8","5"`;
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true, text: async () => csv,
    });

    const games = await fetchRetrosheetSeasonGames(2024);
    expect(games[0]).toMatchObject({
      gameDate: '2024-03-28',
      awayTeam: 'NYY',
      homeTeam: 'BOS',
      awayScore: 8,
      homeScore: 5,
      winner: 'NYY',
    });
  });

  it('throws on non-OK HTTP', async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: false, status: 404,
    });
    await expect(fetchRetrosheetSeasonGames(2024)).rejects.toThrow(/retrosheet/);
  });
});
