import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OVERVIEW_CLOSE_PP, OVERVIEW_DOMINANT_PP } from '@/lib/analysis/factor-explanations';

const ROOT = join(__dirname, '../../..');

const TARGET_FILES = [
  'src/components/analysis/GameAnalysisProse.tsx',
  'src/components/predictions/MlbGameOverview.tsx',
] as const;

describe('silent drift cycle 2253 — 신뢰도 라벨(박빙/소폭 우위/명확한 우위) marginPp 임계 10/20 하드코딩 → OVERVIEW_CLOSE_PP/OVERVIEW_DOMINANT_PP 단일화', () => {
  it.each(TARGET_FILES)(
    '%s: no hardcoded "marginPp < 10" or "marginPp < 20" literal',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/marginPp\s*<\s*10\b/);
      expect(src).not.toMatch(/marginPp\s*<\s*20\b/);
    },
  );

  it.each(TARGET_FILES)(
    '%s: imports OVERVIEW_CLOSE_PP and OVERVIEW_DOMINANT_PP from factor-explanations',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).toMatch(/OVERVIEW_CLOSE_PP/);
      expect(src).toMatch(/OVERVIEW_DOMINANT_PP/);
    },
  );

  it('OVERVIEW_CLOSE_PP / OVERVIEW_DOMINANT_PP derived values match prior hardcoded 10 / 20', () => {
    expect(OVERVIEW_CLOSE_PP).toBe(10);
    expect(OVERVIEW_DOMINANT_PP).toBe(20);
  });
});
