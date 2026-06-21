import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 102 — buildPicksStats.ts factor neutral threshold 재선언 → factorLabels.ts 단일 source', () => {
  it('buildPicksStats.ts: local FACTOR_NEUTRAL_LO/HI 재선언 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/lib/picks/buildPicksStats.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/const FACTOR_NEUTRAL_LO\s*=/);
    expect(src).not.toMatch(/const FACTOR_NEUTRAL_HI\s*=/);
  });

  it('buildPicksStats.ts: NEUTRAL_LO/HI import from factorLabels', () => {
    const src = readFileSync(
      join(ROOT, 'src/lib/picks/buildPicksStats.ts'),
      'utf8',
    );
    expect(src).toMatch(
      /import\s*\{[^}]*\bNEUTRAL_(HI|LO)\b[^}]*\}\s*from\s*['"]@\/lib\/predictions\/factorLabels['"]/,
    );
    expect(src).toMatch(/value > NEUTRAL_HI/);
    expect(src).toMatch(/value < NEUTRAL_LO/);
  });

  it('factorLabels.ts: NEUTRAL_LO=0.45 / NEUTRAL_HI=0.55 single source 유지', () => {
    const src = readFileSync(
      join(ROOT, 'src/lib/predictions/factorLabels.ts'),
      'utf8',
    );
    expect(src).toMatch(/export const NEUTRAL_LO = 0\.45/);
    expect(src).toMatch(/export const NEUTRAL_HI = 0\.55/);
  });
});
