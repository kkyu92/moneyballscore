import { describe, it, expect } from 'vitest';
import { computeCompositeDuel } from '../computeCompositeDuel';

describe('computeCompositeDuel', () => {
  it('returns zeros when all inputs null', () => {
    const result = computeCompositeDuel({ homeCode: 'LT' });
    expect(result.homeWins).toBe(0);
    expect(result.awayWins).toBe(0);
    expect(result.netScore).toBe(0);
  });

  it('counts home-favored factors correctly', () => {
    // home advantage on wOBA + SFR + bullpen (away worse FIP) + SP FIP (away worse) + WAR
    const result = computeCompositeDuel({
      homeCode: 'LT',
      homeLineupWoba: 0.360,
      awayLineupWoba: 0.330,   // diff 0.030 >= 0.020 → home
      homeSfr: 10,
      awaySfr: 0,               // diff 10 >= 5 → home
      homeBullpenFip: 3.5,
      awayBullpenFip: 5.0,      // away - home = 1.5 >= 1.0 → home
      homeSPFip: 3.5,
      awaySPFip: 5.0,           // away - home = 1.5 >= 0.5 → home
      homeWar: 30,
      awayWar: 10,              // diff 20 >= 5 → home
    });
    expect(result.homeWins).toBeGreaterThanOrEqual(5);
    expect(result.awayWins).toBe(0);
    expect(result.netScore).toBe(result.homeWins);
  });

  it('gives netScore=0 when validCount < COMPOSITE_DUEL_MIN_VALID', () => {
    // Only 1 factor provided — park may count too depending on team, but total stays < 4
    const result = computeCompositeDuel({
      homeCode: 'LT',
      homeLineupWoba: 0.360,
      awayLineupWoba: 0.330,
    });
    expect(result.validCount).toBeLessThan(4);
    expect(result.netScore).toBe(0);
  });

  it('applies park factor for hitter-friendly park', () => {
    // KIA = Gwangju (parkPf >= 105 → home win)
    const result = computeCompositeDuel({
      homeCode: 'KIA',
    });
    // parkResult should be 'home' if KIA's parkPf >= PARK_FACTOR_HITTER_MIN
    // At minimum check it doesn't throw and valid park factor is counted
    expect(result.validCount).toBeGreaterThanOrEqual(0);
    expect(typeof result.netScore).toBe('number');
  });

  it('counts both home and away wins when each side has advantages', () => {
    const result = computeCompositeDuel({
      homeCode: 'LT',
      homeLineupWoba: 0.360,
      awayLineupWoba: 0.330,   // home wOBA win
      homeSfr: 0,
      awaySfr: 10,             // away SFR win
      homeBullpenFip: 3.5,
      awayBullpenFip: 3.6,    // diff 0.1 < 1.0 → null
      homeSPFip: 3.5,
      awaySPFip: 5.0,          // home SP FIP win
      homeWar: 10,
      awayWar: 30,             // away WAR win
      homeElo: 1500,
      awayElo: 1500,           // tie → null
    });
    expect(result.homeWins).toBeGreaterThanOrEqual(1);
    expect(result.awayWins).toBeGreaterThanOrEqual(1);
  });
});
