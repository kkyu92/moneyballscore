import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchFangraphsMlbTeams } from '../fangraphs-mlb';

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

global.fetch = vi.fn();

beforeEach(() => {
  vi.mocked(global.fetch as any).mockReset();
});

describe('fangraphs-mlb.fetchFangraphsMlbTeams', () => {
  it('parses team stats from HTML table', async () => {
    const html = `<table id="LeaderBoard1_dg1_ctl00">
      <tbody>
        <tr>
          <td>1</td>
          <td><a>LAD</a></td>
          <td>0.340</td><td>3.42</td><td>3.50</td><td>48.5</td>
          <td>20.5</td><td>42.5</td><td>37.0</td><td>8.5</td>
          <td>15.5</td><td>40.0</td><td>35.0</td><td>25.0</td>
        </tr>
      </tbody></table>`;

    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true, text: async () => html,
    });

    const teams = await fetchFangraphsMlbTeams(2026);
    expect(teams).toHaveLength(1);
    expect(teams[0]).toMatchObject({
      teamCode: 'LAD',
      woba: 0.340,
      fip: 3.42,
      xfip: 3.50,
      war: 48.5,
      ldPct: 20.5,
      gbPct: 42.5,
      fbPct: 37.0,
      iffbPct: 8.5,
      hrFbPct: 15.5,
      pullPct: 40.0,
      centPct: 35.0,
      oppoPct: 25.0,
    });
  });

  it('throws on parse fail (selector 변경 detect)', async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true, text: async () => '<html></html>',
    });

    await expect(fetchFangraphsMlbTeams(2026))
      .rejects.toThrow(/parse fail/);
  });

  it('throws on non-OK HTTP', async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: false, status: 500,
    });
    await expect(fetchFangraphsMlbTeams(2026))
      .rejects.toThrow(/HTTP 500/);
  });
});
