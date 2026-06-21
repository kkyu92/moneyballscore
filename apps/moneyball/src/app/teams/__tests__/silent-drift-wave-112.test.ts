import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');

const TARGETS = [
  'src/app/mlb/factors/page.tsx',
  'src/app/en/mlb/factors/page.tsx',
];

describe('silent drift wave 112 — HOME_ELO_BONUS "24" literal sweep', () => {
  for (const rel of TARGETS) {
    it(`${rel}: no hardcoded "24 Elo" / "24점" / "24 points" literal`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/"24 Elo/);
      expect(src).not.toMatch(/'24 Elo/);
      expect(src).not.toMatch(/[^a-zA-Z_]24점/);
      expect(src).not.toMatch(/"24 points/);
      expect(src).not.toMatch(/'24 points/);
    });
    it(`${rel}: imports HOME_ELO_BONUS from @moneyball/shared`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).toMatch(/HOME_ELO_BONUS/);
    });
  }
});
