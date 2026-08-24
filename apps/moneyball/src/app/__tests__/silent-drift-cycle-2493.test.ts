import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

const TARGET_FILES = [
  'src/components/analysis/GameAnalysisProse.tsx',
  'src/components/predictions/MlbGameOverview.tsx',
] as const;

describe('silent drift cycle 2493 — marginPp 계산 하드코딩 * 200 / 0.5 → NEUTRAL_FACTOR + FACTOR_CONTRIBUTION_SCALE 단일화 (review-code heavy, factor-explanations.ts 감사 후속)', () => {
  it.each(TARGET_FILES)(
    '%s: no hardcoded "* 200" or "- 0.5" literal in marginPp calc',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/marginPp\s*=\s*Math\.round\(Math\.abs\([^)]*\)\s*\*\s*200\)/);
      expect(src).not.toMatch(/homeWinProb\s*-\s*0\.5\b/);
    },
  );

  it.each(TARGET_FILES)(
    '%s: imports FACTOR_CONTRIBUTION_SCALE from @moneyball/shared',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).toMatch(/FACTOR_CONTRIBUTION_SCALE/);
    },
  );
});
