import { describe, it, expect } from 'vitest';
import {
  makeRestricted,
  DEFAULT_RESTRICTED,
} from '../backtest/models';
import type { GameFeatures } from '../backtest/types';

function feat(overrides: Partial<GameFeatures>): GameFeatures {
  return {
    homeElo: 1500,
    awayElo: 1500,
    homeForm: 0.5,
    awayForm: 0.5,
    h2hHomeWins: 0,
    h2hAwayWins: 0,
    parkPf: 100,
    homeTeam: 'LG',
    awayTeam: 'HT',
    ...overrides,
  };
}

describe('makeRestricted h2hMinN', () => {
  it('default (h2hMinN=2) applies h2h shift at N=2', () => {
    const model = makeRestricted(DEFAULT_RESTRICTED);
    const fNoH2h = feat({ h2hHomeWins: 0, h2hAwayWins: 0 });
    const f2_0 = feat({ h2hHomeWins: 2, h2hAwayWins: 0 });
    const pNoH2h = model(fNoH2h);
    const p2_0 = model(f2_0);
    expect(p2_0).toBeGreaterThan(pNoH2h);
  });

  it('h2hMinN=3 ignores N=2 sample (noise reduction)', () => {
    const model = makeRestricted({ ...DEFAULT_RESTRICTED, h2hMinN: 3 });
    const fNoH2h = feat({ h2hHomeWins: 0, h2hAwayWins: 0 });
    const f2_0 = feat({ h2hHomeWins: 2, h2hAwayWins: 0 });
    expect(model(f2_0)).toBeCloseTo(model(fNoH2h), 10);
  });

  it('h2hMinN=3 still applies at N=3', () => {
    const model = makeRestricted({ ...DEFAULT_RESTRICTED, h2hMinN: 3 });
    const fNoH2h = feat({ h2hHomeWins: 0, h2hAwayWins: 0 });
    const f3_0 = feat({ h2hHomeWins: 3, h2hAwayWins: 0 });
    expect(model(f3_0)).toBeGreaterThan(model(fNoH2h));
  });

  it('h2hMinN=5 ignores N=3,4 samples', () => {
    const model = makeRestricted({ ...DEFAULT_RESTRICTED, h2hMinN: 5 });
    const fNoH2h = feat({ h2hHomeWins: 0, h2hAwayWins: 0 });
    const f3_1 = feat({ h2hHomeWins: 3, h2hAwayWins: 1 });
    const f4_0 = feat({ h2hHomeWins: 4, h2hAwayWins: 0 });
    const f5_0 = feat({ h2hHomeWins: 5, h2hAwayWins: 0 });
    expect(model(f3_1)).toBeCloseTo(model(fNoH2h), 10);
    expect(model(f4_0)).toBeCloseTo(model(fNoH2h), 10);
    expect(model(f5_0)).toBeGreaterThan(model(fNoH2h));
  });

  it('h2hMinN=2 (default) preserves cycle 60 박제 동작', () => {
    // cycle 60 review-code 박제: 2/0=100% 시 ±kH2h Elo pt shift
    const model = makeRestricted({
      ...DEFAULT_RESTRICTED,
      kH2h: 30,
      kForm: 0,
      kPark: 0,
      kElo: 0,
      homeAdvElo: 0,
    });
    const f2_0 = feat({ h2hHomeWins: 2, h2hAwayWins: 0 });
    // h2hRate=1, (rate-0.5)*2=1, delta = 30 Elo pt → sigmoidElo(30) ≈ 0.543
    expect(model(f2_0)).toBeGreaterThan(0.5);
    expect(model(f2_0)).toBeLessThan(0.6);
  });
});

describe('DEFAULT_RESTRICTED schema', () => {
  it('includes h2hMinN field (cycle 67 carry-over)', () => {
    expect(DEFAULT_RESTRICTED.h2hMinN).toBe(2);
  });
});
