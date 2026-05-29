import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSavantTeamStatcast } from '../baseball-savant';

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

global.fetch = vi.fn();

beforeEach(() => {
  vi.mocked(global.fetch as any).mockReset();
});

describe('baseball-savant.fetchSavantTeamStatcast', () => {
  it('parses CSV Statcast 4 factor', async () => {
    const csv = `player_id,player_name,team,xwoba,brl_percent,hard_hit_percent,launch_angle\n` +
      `1001,Team LAD,LAD,0.351,10.4,38.5,12.3\n` +
      `2002,Team NYY,NYY,0.339,9.1,37.2,11.8`;

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true, text: async () => csv,
    });

    const teams = await fetchSavantTeamStatcast(2026);
    expect(teams).toHaveLength(2);
    expect(teams[0]).toEqual({
      teamCode: 'LAD',
      xwoba: 0.351,
      barrelPct: 10.4,
      hardHitPct: 38.5,
      launchAngle: 12.3,
    });
  });

  it('skips rows with invalid xwOBA (range 0~0.5)', async () => {
    const csv = `player_id,player_name,team,xwoba,brl_percent,hard_hit_percent,launch_angle\n` +
      `1,Team A,LAD,0.999,10,38,12`;

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true, text: async () => csv,
    });

    const teams = await fetchSavantTeamStatcast(2026);
    expect(teams).toEqual([]);
  });

  it('throws on CSV parse fail (format 변경)', async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true, text: async () => 'invalid,csv',
    });

    await expect(fetchSavantTeamStatcast(2026))
      .rejects.toThrow(/parse fail/);
  });
});
