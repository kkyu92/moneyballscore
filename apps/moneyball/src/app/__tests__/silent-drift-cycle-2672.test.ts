import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// cycle 2672 review-code(heavy): FactorAccuracyTable.tsx KBO footer hardcoded
// literal 'v1.8' instead of deriving from CURRENT_SCORING_RULE — same bug
// class already fixed once in BrierTrendChart.tsx (silent drift wave-260,
// cycle 1566) and documented as a recurring failure mode in
// config/model.ts's "버전 전환 시 체크리스트". Today the literal happened to
// be correct (CURRENT_SCORING_RULE === 'v1.8'), but the label would go
// silently stale on the next version bump. Fix: interpolate
// CURRENT_SCORING_RULE from @moneyball/shared instead of the literal.
const TARGET = join(
  __dirname,
  '../../components/accuracy/FactorAccuracyTable.tsx',
);

describe('silent-drift cycle 2672: FactorAccuracyTable footer version label', () => {
  const src = readFileSync(TARGET, 'utf8');

  it('imports CURRENT_SCORING_RULE from shared', () => {
    expect(src).toMatch(
      /import\s*\{[^}]*\bCURRENT_SCORING_RULE\b[^}]*\}\s*from\s*'@moneyball\/shared'/,
    );
  });

  it('KBO footer interpolates CURRENT_SCORING_RULE instead of a hardcoded version literal', () => {
    expect(src).toMatch(/\$\{CURRENT_SCORING_RULE\}\s*cohort n=/);
    expect(src).not.toMatch(/\(v1\.8 cohort n=/);
  });
});
