import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');

const TARGETS = [
  'src/app/methodology/page.tsx',
  'src/app/about/page.tsx',
  'src/app/glossary/data.ts',
  'src/app/en/mlb/factors/page.tsx',
  'src/app/mlb/factors/page.tsx',
];

describe('silent drift wave 91 — HOME_ADVANTAGE +1.5% literal sweep', () => {
  for (const rel of TARGETS) {
    it(`${rel}: no hardcoded "+1.5%" / "+1.5%p" literal`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/"\+1\.5%/);
      expect(src).not.toMatch(/'\+1\.5%/);
      expect(src).not.toMatch(/`\+1\.5%/);
      expect(src).not.toMatch(/[^.0-9]\+1\.5%p/);
      expect(src).not.toMatch(/[^.0-9]\+1\.5% /);
    });
    it(`${rel}: imports HOME_ADVANTAGE_PCT from @moneyball/shared`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).toMatch(/HOME_ADVANTAGE_PCT/);
    });
  }
});
