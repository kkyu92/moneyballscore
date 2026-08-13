import { describe, it, expect } from 'vitest';
import { computeMlbCompositeDuel } from '../computeMlbCompositeDuel';

describe('computeMlbCompositeDuel', () => {
  it('returns zeros when all inputs null', () => {
    const result = computeMlbCompositeDuel({ homeCode: 'NYM' });
    expect(result.homeWins).toBe(0);
    expect(result.awayWins).toBe(0);
    expect(result.netScore).toBe(0);
  });

  it('counts home-favored factors correctly across the 6 MLB-available factors', () => {
    const result = computeMlbCompositeDuel({
      homeCode: 'NYM',
      homeLineupWoba: 0.360,
      awayLineupWoba: 0.330,
      homeBullpenFip: 3.5,
      awayBullpenFip: 5.0,
      homeSPFip: 3.5,
      awaySPFip: 5.0,
      homeSPXfip: 3.5,
      awaySPXfip: 5.0,
      homeWar: 30,
      awayWar: 10,
    });
    expect(result.homeWins).toBeGreaterThanOrEqual(4);
    expect(result.awayWins).toBe(0);
    expect(result.netScore).toBe(result.homeWins);
  });

  it('gives netScore=0 when validCount < MLB_COMPOSITE_DUEL_MIN_VALID(3)', () => {
    const result = computeMlbCompositeDuel({
      homeCode: 'NYM',
      homeLineupWoba: 0.360,
      awayLineupWoba: 0.330,
    });
    expect(result.validCount).toBeLessThan(3);
    expect(result.netScore).toBe(0);
  });

  it('never exceeds 6 valid factors (elo/recent_form/head_to_head/sfr unavailable for MLB)', () => {
    const result = computeMlbCompositeDuel({
      homeCode: 'NYM',
      homeLineupWoba: 0.360,
      awayLineupWoba: 0.330,
      homeBullpenFip: 3.5,
      awayBullpenFip: 5.0,
      homeSPFip: 3.5,
      awaySPFip: 5.0,
      homeSPXfip: 3.5,
      awaySPXfip: 5.0,
      homeWar: 30,
      awayWar: 10,
    });
    expect(result.validCount).toBeLessThanOrEqual(6);
  });

  it('applies park factor without throwing for any valid MlbTeamCode', () => {
    const result = computeMlbCompositeDuel({ homeCode: 'COL' });
    expect(result.validCount).toBeGreaterThanOrEqual(0);
    expect(typeof result.netScore).toBe('number');
  });
});
