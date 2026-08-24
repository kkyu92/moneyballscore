import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 669 — teams/[code]/recent + players/[id] 소표본 게이트 부재 (review-code heavy, cycle 2549)', () => {
  describe('teams/[code]/recent/page.tsx', () => {
    const src = readFileSync(join(ROOT, 'src/app/teams/[code]/recent/page.tsx'), 'utf8');

    it('imports SMALL_SAMPLE_N from shared', () => {
      expect(src).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/);
    });

    it('gates the 적중률 stat with SMALL_SAMPLE_N', () => {
      expect(src).toMatch(/verifiedRows\.length\s*<\s*SMALL_SAMPLE_N/);
    });

    it('surfaces an inline small-sample note near the stat', () => {
      expect(src).toMatch(/소표본\(n<\$\{SMALL_SAMPLE_N\}\)/);
    });
  });

  describe('players/[id]/page.tsx', () => {
    const src = readFileSync(join(ROOT, 'src/app/players/[id]/page.tsx'), 'utf8');

    it('imports SMALL_SAMPLE_N from shared', () => {
      expect(src).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/);
    });

    it('gates the 예측 적중률 stat with SMALL_SAMPLE_N', () => {
      expect(src).toMatch(/verifiedN\s*<\s*SMALL_SAMPLE_N/);
    });

    it('surfaces an inline small-sample note near the stat', () => {
      expect(src).toMatch(/소표본\(n<\$\{SMALL_SAMPLE_N\}\)/);
    });
  });
});
