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

function nextDataHtml(statsParam: 'bat' | 'pit', rows: Record<string, unknown>[]): string {
  const payload = {
    props: {
      pageProps: {
        dehydratedState: {
          queries: [
            {
              queryKey: ['leaders/major-league/data', { stats: statsParam }],
              state: { data: { data: rows } },
            },
          ],
        },
      },
    },
  };
  return `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(payload)}</script></body></html>`;
}

const batRow = (team: string) => ({
  Team: `<a href="leaders.aspx?team=1">${team}</a>`,
  wOBA: 0.34,
  WAR: 48.5,
  'LD%': 0.205,
  'GB%': 0.425,
  'FB%': 0.37,
  'IFFB%': 0.085,
  'HR/FB': 0.155,
  'Pull%': 0.4,
  'Cent%': 0.35,
  'Oppo%': 0.25,
});

const pitRow = (team: string) => ({
  Team: `<a href="leaders.aspx?team=1">${team}</a>`,
  FIP: 3.42,
  xFIP: 3.5,
});

describe('fangraphs-mlb.fetchFangraphsMlbTeams', () => {
  it('parses team stats from __NEXT_DATA__ bat+pit queries', async () => {
    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({ ok: true, text: async () => nextDataHtml('bat', [batRow('LAD')]) })
      .mockResolvedValueOnce({ ok: true, text: async () => nextDataHtml('pit', [pitRow('LAD')]) });

    const teams = await fetchFangraphsMlbTeams(2026);
    expect(teams).toHaveLength(1);
    expect(teams[0]).toMatchObject({
      teamCode: 'LAD',
      woba: 0.34,
      fip: 3.42,
      xfip: 3.5,
      war: 48.5,
      ldPct: 20.5,
      gbPct: 42.5,
      fbPct: 37,
      iffbPct: 8.5,
      hrFbPct: 15.5,
      pullPct: 40,
      centPct: 35,
      oppoPct: 25,
    });
  });

  it('skips teams present in bat but missing in pit (no fip/xfip match)', async () => {
    vi.mocked(global.fetch as any)
      .mockResolvedValueOnce({ ok: true, text: async () => nextDataHtml('bat', [batRow('LAD'), batRow('MIL')]) })
      .mockResolvedValueOnce({ ok: true, text: async () => nextDataHtml('pit', [pitRow('LAD')]) });

    const teams = await fetchFangraphsMlbTeams(2026);
    expect(teams).toHaveLength(1);
    expect(teams[0].teamCode).toBe('LAD');
  });

  it('throws on parse fail (__NEXT_DATA__ 구조 변경 detect)', async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true, text: async () => '<html></html>',
    });

    await expect(fetchFangraphsMlbTeams(2026))
      .rejects.toThrow(/parse fail/);
  });

  it('throws on empty leader rows', async () => {
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true, text: async () => nextDataHtml('bat', []),
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
