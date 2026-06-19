import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');

const TARGETS = [
  'src/components/layout/Footer.tsx',
  'src/app/mlb/team/[code]/opengraph-image.tsx',
  'src/app/en/mlb/team/[code]/opengraph-image.tsx',
  'src/app/mlb/games/[date]/[slug]/page.tsx',
  'src/app/en/mlb/games/[date]/[slug]/page.tsx',
];

describe('silent drift wave 78 — MLB 14 factor surface sweep (Footer + team OG + games detail)', () => {
  for (const rel of TARGETS) {
    it(`${rel}: no hardcoded "14팩터" / "14 Factor" / "14 factor" literal`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/"14팩터/);
      expect(src).not.toMatch(/'14팩터/);
      expect(src).not.toMatch(/`14팩터/);
      expect(src).not.toMatch(/>14팩터/);
      expect(src).not.toMatch(/"14 Factor/);
      expect(src).not.toMatch(/'14 Factor/);
      expect(src).not.toMatch(/`14 Factor/);
      expect(src).not.toMatch(/>14 Factor/);
      expect(src).not.toMatch(/"14 factor/);
      expect(src).not.toMatch(/'14 factor/);
      expect(src).not.toMatch(/`14 factor/);
      expect(src).not.toMatch(/>14 factor/);
    });
    it(`${rel}: imports MLB_FACTOR_COUNTS from @moneyball/kbo-data`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).toMatch(/MLB_FACTOR_COUNTS/);
    });
  }
});
