import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');
const TARGET = 'src/components/accuracy/FactorAccuracyTable.tsx';

describe('silent drift wave 663 — FactorAccuracyTable 소표본 게이트 부재 (review-code heavy, accuracy/page.tsx 감사 후속)', () => {
  const src = readFileSync(join(ROOT, TARGET), 'utf8');

  it('imports SMALL_SAMPLE_N from shared', () => {
    expect(src).toMatch(/import\s*\{[^}]*\bSMALL_SAMPLE_N\b[^}]*\}\s*from\s*'@moneyball\/shared'/);
  });

  it('dims rows with n < SMALL_SAMPLE_N, matching TeamMatchupCards/team-table/day-of-week convention', () => {
    expect(src).toMatch(/r\.n\s*<\s*SMALL_SAMPLE_N/);
    expect(src).toMatch(/opacity-50/);
  });

  it('surfaces a small-sample note per locale (ko + mlb-ko + mlb-en)', () => {
    expect(src).toMatch(/smallSampleNote/);
    const matches = src.match(/smallSampleNote:/g) ?? [];
    expect(matches.length).toBe(3);
  });
});
