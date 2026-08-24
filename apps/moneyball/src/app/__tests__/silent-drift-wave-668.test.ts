import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');
const TARGET = 'src/app/predictions/[date]/page.tsx';

describe('silent drift wave 668 — predictions/[date] 헤더 적중률 소표본 게이트 부재 (review-code heavy, cycle 2548)', () => {
  const src = readFileSync(join(ROOT, TARGET), 'utf8');

  it('imports SMALL_SAMPLE_N from shared', () => {
    expect(src).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/);
  });

  it('gates the header 적중률 stat with SMALL_SAMPLE_N', () => {
    expect(src).toMatch(/totalN\s*<\s*SMALL_SAMPLE_N/);
  });

  it('surfaces an inline small-sample note near the header stat', () => {
    expect(src).toMatch(/소표본\(n&lt;\{SMALL_SAMPLE_N\}\)/);
  });
});
