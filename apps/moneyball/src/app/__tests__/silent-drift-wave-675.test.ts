import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 675 — 적중 표시 green→brand DESIGN.md 토큰 정렬 (polish-ui, cycle 2563)', () => {
  it('DailyPredictionSummaryBar 적중 마크는 brand 토큰만 사용', () => {
    const src = readFileSync(
      join(ROOT, 'src/components/predictions/DailyPredictionSummaryBar.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/text-green-|bg-green-/);
    expect(src).toMatch(/isCorrect\s*\?\s*'text-brand-600 dark:text-brand-400'/);
    expect(src).toMatch(/bg-brand-50 dark:bg-brand-900\/20 text-brand-700 dark:text-brand-400/);
  });

  it('mlb/analysis 어제 결과 적중 마크는 brand 토큰만 사용', () => {
    const src = readFileSync(join(ROOT, 'src/app/mlb/analysis/page.tsx'), 'utf8');
    expect(src).not.toMatch(/text-green-/);
    expect(src).toMatch(/"text-brand-600 dark:text-brand-400"/);
  });

  it('en/mlb/analysis 미러도 동일하게 brand 토큰만 사용', () => {
    const src = readFileSync(join(ROOT, 'src/app/en/mlb/analysis/page.tsx'), 'utf8');
    expect(src).not.toMatch(/text-green-/);
    expect(src).toMatch(/"text-brand-600 dark:text-brand-400"/);
  });
});
