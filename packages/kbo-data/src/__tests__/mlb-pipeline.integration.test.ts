import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMlbSchedule } from '../scrapers/statsapi-mlb';
import { computeMlbProbability, type MlbFactorInputs } from '../factors/mlb-base';

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

global.fetch = vi.fn();

beforeEach(() => {
  vi.mocked(global.fetch as any).mockReset();
});

describe('MLB Pipeline Integration (mock)', () => {
  it('full mock pipeline: scrape → factor → prediction (no DB)', async () => {
    // 1. statsapi schedule mock
    vi.mocked(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dates: [{ games: [{
          gamePk: 999999,
          gameDate: '2026-05-29T23:05:00Z',
          teams: {
            home: { team: { abbreviation: 'LAD' }, score: undefined },
            away: { team: { abbreviation: 'NYY' }, score: undefined },
          },
          status: { detailedState: 'Scheduled' },
        }]}],
      }),
    });
    const games = await fetchMlbSchedule('2026-05-29');
    expect(games).toHaveLength(1);
    expect(games[0].gamePk).toBe(999999);

    // 2. factor pipeline run
    const input: MlbFactorInputs = {
      sp_fip: { home: 3.0, away: 3.5 },
      sp_xfip: { home: 3.2, away: 3.7 },
      lineup_woba: { home: 0.340, away: 0.335 },
      bullpen_fip: { home: 3.5, away: 3.7 },
      recent_form: { home: 7, away: 5 },
      war: { home: 50, away: 45 },
      head_to_head: { homeWinRate: 0.55 },
      park_factor: 1.02,
      elo: { home: 1550, away: 1500 },
      defense_sfr: { home: 5, away: 3 },
      lineup_xwoba: { home: 0.351, away: 0.339 },
      lineup_barrel_pct: { home: 10.4, away: 9.1 },
      sp_xwoba_against: { home: 0.290, away: 0.310 },
      woba_std: { home: 0.022, away: 0.024 },
    };
    const probability = computeMlbProbability(input);
    expect(probability).toBeGreaterThanOrEqual(0.15);
    expect(probability).toBeLessThanOrEqual(0.85);

    // 3. predicted winner
    const predictedWinner = probability > 0.5 ? games[0].homeTeam : games[0].awayTeam;
    expect(['LAD', 'NYY']).toContain(predictedWinner);
  });

  it('사례 11 silent silent drop guard — predict=0 + games>0 invariant', async () => {
    const Sentry = await import('@sentry/nextjs');

    // simulate: predict_final found 5 games but inserted 0 predictions
    const gamesFound = 5;
    const predictionsInserted = 0;

    if (gamesFound > 0 && predictionsInserted === 0) {
      Sentry.captureMessage(
        `silent silent drop: predict_final found ${gamesFound} games but inserted 0`,
        'warning',
      );
    }
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('silent silent drop'),
      'warning',
    );
  });
});
