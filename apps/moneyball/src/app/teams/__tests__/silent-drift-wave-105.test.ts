import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');

const TARGETS = [
  'src/app/methodology/page.tsx',
  'src/app/about/page.tsx',
  'src/app/glossary/data.ts',
];

describe('silent drift wave 105 — HOME_WIN_RATE 실측 (51.93% / N=2180 / ±2.10pp) literal sweep', () => {
  for (const rel of TARGETS) {
    it(`${rel}: no hardcoded "51.93" literal`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/51\.93/);
    });
    it(`${rel}: no hardcoded "N=2180" / "2,180경기" / "2180" sample-size literal`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/N=2180/);
      expect(src).not.toMatch(/2,180/);
    });
    it(`${rel}: imports HOME_WIN_RATE_PCT / HOME_WIN_RATE_SAMPLE_N from @moneyball/shared`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).toMatch(/HOME_WIN_RATE_PCT/);
      expect(src).toMatch(/HOME_WIN_RATE_SAMPLE_N/);
    });
  }
});
