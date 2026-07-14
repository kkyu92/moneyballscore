import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const STANDINGS_SRC = readFileSync(
  join(__dirname, '../../app/standings/page.tsx'),
  'utf8',
);

describe('explore-idea wave-304 — /standings Elo 컬럼 (cycle 1633)', () => {
  it('standings page imports ELO_NEUTRAL from @moneyball/shared', () => {
    expect(STANDINGS_SRC).toContain('ELO_NEUTRAL');
    expect(STANDINGS_SRC).toContain('@moneyball/shared');
  });

  it('standings page extracts currentEloMap from eloTrend.points', () => {
    expect(STANDINGS_SRC).toContain('currentEloMap');
    expect(STANDINGS_SRC).toContain('lastEloPoint');
    expect(STANDINGS_SRC).toContain("eloTrend.points[eloTrend.points.length - 1]");
  });

  it('standings table has Elo column header', () => {
    expect(STANDINGS_SRC).toContain('>Elo<');
  });

  it('Elo cell uses eloAboveNeutral for brand color class', () => {
    expect(STANDINGS_SRC).toContain('eloAboveNeutral');
    expect(STANDINGS_SRC).toContain('Math.round(currentElo)');
  });

  it('Elo column header has tooltip with ELO_NEUTRAL baseline', () => {
    expect(STANDINGS_SRC).toContain('title={`Elo 레이팅 (기준: ${ELO_NEUTRAL})`}');
  });
});
