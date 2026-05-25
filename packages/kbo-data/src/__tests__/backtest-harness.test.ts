import { describe, expect, it } from 'vitest';

import {
  ALL_FACTORS,
  BASE_FACTORS,
  CANDIDATE_FACTORS,
  HarnessInputSchema,
  HarnessOutputSchema,
  measureFactorCoverage,
  runHarness,
  type HarnessInput,
} from '../backtest/harness';
import type { BacktestGame, GameFeatures, Model } from '../backtest/types';
import type { EloHistory } from '../backtest/elo-history';

function validInput(overrides: Partial<HarnessInput> = {}): unknown {
  return {
    scope: { seasonStart: 2024, seasonEnd: 2025 },
    factors: { base: ['sp_fip', 'elo'] },
    weights: { sp_fip: 0.15, elo: 0.1 },
    ...overrides,
  };
}

describe('HarnessInputSchema', () => {
  it('parses a minimal valid input + applies defaults', () => {
    const parsed = HarnessInputSchema.parse(validInput());
    expect(parsed.factors.candidates).toEqual([]);
    expect(parsed.options.homeAdvantage).toBe(0.015);
    expect(parsed.options.includeFancyStats).toBe(false);
    expect(parsed.options.skipMissingFeatures).toBe(true);
  });

  it('rejects empty input', () => {
    expect(() => HarnessInputSchema.parse({})).toThrow();
  });

  it('rejects unknown factor enum (silent shape drift 차단)', () => {
    expect(() =>
      HarnessInputSchema.parse({
        scope: { seasonStart: 2024, seasonEnd: 2025 },
        factors: { base: ['unknown_factor' as never] },
        weights: {},
      }),
    ).toThrow();
  });

  it('rejects weight > 1', () => {
    expect(() =>
      HarnessInputSchema.parse(
        validInput({ weights: { sp_fip: 1.5 } as never }),
      ),
    ).toThrow();
  });

  it('rejects seasonEnd < seasonStart', () => {
    expect(() =>
      HarnessInputSchema.parse(
        validInput({
          scope: { seasonStart: 2025, seasonEnd: 2024 } as never,
        }),
      ),
    ).toThrow();
  });

  it('rejects malformed date string', () => {
    expect(() =>
      HarnessInputSchema.parse(
        validInput({
          scope: {
            seasonStart: 2024,
            seasonEnd: 2025,
            dateStart: '24-01-01',
          } as never,
        }),
      ),
    ).toThrow();
  });

  it('accepts candidate factor 9 enums (plan #9 Step 1 박제)', () => {
    const parsed = HarnessInputSchema.parse(
      validInput({
        factors: {
          base: ['sp_fip'],
          candidates: [
            'back_to_back',
            'weather_temp',
            'travel_distance',
            'series_game_order',
            'streak_momentum',
            'sp_rest_days',
            'umpire_strike_zone_bias',
          ],
        },
      }),
    );
    expect(parsed.factors.candidates).toHaveLength(7);
  });
});

describe('factor enum constants', () => {
  it('BASE_FACTORS has exactly 10 entries (v1.8 가중치)', () => {
    expect(BASE_FACTORS).toHaveLength(10);
  });

  it('CANDIDATE_FACTORS has 9 entries (plan #9 Step 1 박제)', () => {
    expect(CANDIDATE_FACTORS).toHaveLength(9);
  });

  it('ALL_FACTORS = base ∪ candidates with no overlap', () => {
    expect(ALL_FACTORS).toHaveLength(19);
    expect(new Set(ALL_FACTORS).size).toBe(19);
  });
});

describe('measureFactorCoverage', () => {
  const baseFeature: GameFeatures = {
    homeElo: 1500,
    awayElo: 1500,
    homeForm: 0.5,
    awayForm: 0.5,
    h2hHomeWins: 0,
    h2hAwayWins: 0,
    parkPf: 100,
    homeTeam: 'LG',
    awayTeam: 'HT',
  };

  it('returns coverage=0 when features array empty', () => {
    const out = measureFactorCoverage('sp_fip', []);
    expect(out.coverage).toBe(0);
    expect(out.nUsed).toBe(0);
    expect(out.nMissing).toBe(0);
  });

  it('counts elo coverage 100% when homeElo + awayElo always set', () => {
    const out = measureFactorCoverage('elo', [baseFeature, baseFeature]);
    expect(out.coverage).toBe(1);
    expect(out.nUsed).toBe(2);
    expect(out.nMissing).toBe(0);
  });

  it('counts sp_fip coverage 0 when homeFip/awayFip undefined', () => {
    const out = measureFactorCoverage('sp_fip', [baseFeature, baseFeature]);
    expect(out.coverage).toBe(0);
    expect(out.nMissing).toBe(2);
  });

  it('handles partial fill (1/2 features have homeFip+awayFip)', () => {
    const filled: GameFeatures = { ...baseFeature, homeFip: 3.5, awayFip: 4.0 };
    const out = measureFactorCoverage('sp_fip', [baseFeature, filled]);
    expect(out.coverage).toBe(0.5);
    expect(out.nUsed).toBe(1);
    expect(out.nMissing).toBe(1);
  });

  it('skips null features (no crash)', () => {
    const out = measureFactorCoverage('elo', [null, baseFeature]);
    expect(out.coverage).toBe(0.5);
    expect(out.nUsed).toBe(1);
  });

  it('candidate factor coverage = 0 (Step 4 carry-over field 미존재)', () => {
    const out = measureFactorCoverage('back_to_back', [baseFeature]);
    expect(out.coverage).toBe(0);
  });
});

describe('runHarness skeleton', () => {
  const game: BacktestGame = {
    id: 1,
    date: '2025-04-01',
    season: 2025,
    homeTeam: 'LG',
    awayTeam: 'HT',
    homeTeamId: 1,
    awayTeamId: 2,
    homeScore: 5,
    awayScore: 3,
    homeWon: true,
  };

  const eloHistory: EloHistory = new Map([
    ['LG', [{ date: '2025-03-01', elo: 1500 }]],
    ['HT', [{ date: '2025-03-01', elo: 1500 }]],
  ]) as never;

  const dummyModel: Model = () => 0.55;

  it('returns Zod-validated output with empty featuresSample', async () => {
    const out = await runHarness(validInput(), {
      games: [game],
      eloHistory,
      models: { dummy: dummyModel },
      featuresSample: [],
    });
    expect(HarnessOutputSchema.safeParse(out).success).toBe(true);
    expect(out.scope.seasonStart).toBe(2024);
    expect(out.factorBreakdown.sp_fip).toBeDefined();
    expect(out.factorBreakdown.elo).toBeDefined();
  });

  it('throws on invalid raw input (Zod guard)', async () => {
    await expect(
      runHarness({ scope: { seasonStart: 9999 } }, {
        games: [],
        eloHistory,
        models: {},
        featuresSample: [],
      }),
    ).rejects.toThrow();
  });

  it('factorBreakdown weights pulled from input.weights', async () => {
    const out = await runHarness(
      validInput({ weights: { sp_fip: 0.2, elo: 0.08 } }),
      { games: [], eloHistory, models: {}, featuresSample: [] },
    );
    expect(out.factorBreakdown.sp_fip?.weight).toBe(0.2);
    expect(out.factorBreakdown.elo?.weight).toBe(0.08);
  });

  it('factorBreakdown weight defaults to 0 when not in weights map', async () => {
    const out = await runHarness(
      {
        scope: { seasonStart: 2024, seasonEnd: 2025 },
        factors: { base: ['sp_fip'], candidates: ['back_to_back'] },
        weights: { sp_fip: 0.15 },
      },
      { games: [], eloHistory, models: {}, featuresSample: [] },
    );
    expect(out.factorBreakdown.back_to_back?.weight).toBe(0);
  });
});
