import { describe, it, expect } from 'vitest';
import { vectorizeExtended, FEATURE_NAMES_EXTENDED } from '../logistic';
import type { GameFeatures } from '../types';

function baseFeatures(overrides: Partial<GameFeatures> = {}): GameFeatures {
  return {
    homeElo: 1500,
    awayElo: 1500,
    homeForm: 0.5,
    awayForm: 0.5,
    h2hHomeWins: 0,
    h2hAwayWins: 0,
    parkPf: 100,
    homeTeam: 'SK',
    awayTeam: 'HT',
    ...overrides,
  };
}

describe('vectorizeExtended asymmetric-null guard', () => {
  it('both woba/fip/sfr present → real diff (non-zero)', () => {
    const f = baseFeatures({
      homeWoba: 0.34,
      awayWoba: 0.3,
      homeFip: 3.5,
      awayFip: 4.0,
      homeSfr: 5,
      awaySfr: -5,
    });
    const [, , , , wobaDiff, fipDiff, sfrDiff] = vectorizeExtended(f);
    expect(wobaDiff).toBeCloseTo((0.34 - 0.3) * 20, 6);
    expect(fipDiff).toBeCloseTo((4.0 - 3.5) / 2, 6);
    expect(sfrDiff).toBeCloseTo((5 - -5) / 20, 6);
  });

  it('home-only missing → diff 0 (neutral), not biased toward away', () => {
    const f = baseFeatures({
      awayWoba: 0.34,
      awayFip: 3.5,
      awaySfr: 10,
    });
    const [, , , , wobaDiff, fipDiff, sfrDiff] = vectorizeExtended(f);
    expect(wobaDiff).toBe(0);
    expect(fipDiff).toBe(0);
    expect(sfrDiff).toBe(0);
  });

  it('away-only missing → diff 0 (neutral), not biased toward home', () => {
    const f = baseFeatures({
      homeWoba: 0.34,
      homeFip: 3.5,
      homeSfr: 10,
    });
    const [, , , , wobaDiff, fipDiff, sfrDiff] = vectorizeExtended(f);
    expect(wobaDiff).toBe(0);
    expect(fipDiff).toBe(0);
    expect(sfrDiff).toBe(0);
  });

  it('both missing → diff 0', () => {
    const f = baseFeatures();
    const [, , , , wobaDiff, fipDiff, sfrDiff] = vectorizeExtended(f);
    expect(wobaDiff).toBe(0);
    expect(fipDiff).toBe(0);
    expect(sfrDiff).toBe(0);
  });

  it('FEATURE_NAMES_EXTENDED length matches vectorizeExtended output length', () => {
    const f = baseFeatures({ homeWoba: 0.3, awayWoba: 0.3 });
    expect(vectorizeExtended(f)).toHaveLength(FEATURE_NAMES_EXTENDED.length);
  });
});
