import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');
const TARGET = 'src/app/analysis/game/[id]/page.tsx';

describe('silent drift wave 664 — analysis/game/[id] 팩터 수렴 픽 성적 라인 소표본 게이트 부재 (review-code heavy, cycle 2542)', () => {
  const src = readFileSync(join(ROOT, TARGET), 'utf8');

  it('imports SMALL_SAMPLE_N from shared', () => {
    expect(src).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*'@moneyball\/shared'/);
  });

  it('dims the convergence pick record line when total < SMALL_SAMPLE_N, matching FactorAccuracyTable/TeamMatchupCards convention', () => {
    expect(src).toMatch(/convergenceRecord\.total\s*<\s*SMALL_SAMPLE_N/);
    expect(src).toMatch(/opacity-40/);
  });

  it('surfaces a small-sample note inline', () => {
    expect(src).toMatch(/소표본\(n&lt;\{SMALL_SAMPLE_N\}\)/);
  });
});
