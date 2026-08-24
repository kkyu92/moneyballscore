import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 673 — AccuracyHeaderCard 누적 적중률 헤드라인 소표본 게이트 부재 (review-code heavy, cycle 2555)', () => {
  const src = readFileSync(
    join(ROOT, 'src/components/predictions/AccuracyHeaderCard.tsx'),
    'utf8',
  );

  it('imports SMALL_SAMPLE_N from shared', () => {
    expect(src).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/);
  });

  it('gates the cumulative accuracy headline with SMALL_SAMPLE_N', () => {
    expect(src).toMatch(/totalVerified\s*<\s*SMALL_SAMPLE_N/);
  });

  it('surfaces an inline small-sample note near the headline stat', () => {
    expect(src).toMatch(/소표본\(n<\$\{SMALL_SAMPLE_N\}\)/);
  });
});
