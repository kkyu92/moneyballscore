import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');
const TARGET = 'src/app/analysis/page.tsx';

describe('silent drift wave 665 — analysis/page.tsx 팩터 수렴 픽 성적 라인(목록) 7개 소표본 게이트 부재 (review-code heavy, cycle 2543)', () => {
  const src = readFileSync(join(ROOT, TARGET), 'utf8');

  it('imports SMALL_SAMPLE_N from shared', () => {
    expect(src).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*'@moneyball\/shared'/);
  });

  const recordVars = [
    'recentConvergenceRecord',
    'recentStrongConvergenceRecord',
    'monthlyStrongConvergenceRecord',
    'seasonStrongConvergenceRecord',
    'seasonCompleteConvergenceRecord',
    'monthlyCompleteConvergenceRecord',
    'recentCompleteConvergenceRecord',
  ];

  for (const v of recordVars) {
    it(`gates ${v} with SMALL_SAMPLE_N + inline note, matching FactorAccuracyTable/TeamMatchupCards convention`, () => {
      const gateRe = new RegExp(`${v}\\.total\\s*<\\s*SMALL_SAMPLE_N`);
      expect(src).toMatch(gateRe);
    });
  }

  it('surfaces a small-sample note inline (at least 7 occurrences, one per gated record)', () => {
    const matches = src.match(/소표본\(n&lt;\{SMALL_SAMPLE_N\}\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(7);
  });
});
