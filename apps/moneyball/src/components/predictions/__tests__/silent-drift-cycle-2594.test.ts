import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2594 review-code(heavy): spacing axis 첫 발견 — FactorBreakdown 카드가
// 같은 "팩터별 분석" family(DetailedFactorAnalysis / MlbDetailedFactorAnalysis)와
// 달리 bg-gray-50 + p-4 로 landing. sibling 전부 bg-white + p-5(DESIGN.md card
// padding 20px 스펙). FactorBreakdown 만 유일한 이탈.

const src = readFileSync(join(__dirname, '../FactorBreakdown.tsx'), 'utf8');

describe('silent drift cycle 2594 — FactorBreakdown 카드 padding/배경 정렬', () => {
  it('카드 wrapper = bg-white + p-5 (DetailedFactorAnalysis/MlbDetailedFactorAnalysis 정렬)', () => {
    expect(src).toContain(
      'bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-5'
    );
  });

  it('이탈 값(카드 wrapper bg-gray-50 / p-4) 잔존 0건', () => {
    expect(src).not.toContain('bg-gray-50 dark:bg-[var(--color-surface-card)]');
    expect(src).not.toMatch(/rounded-xl border[^`]*p-4(?!\d)/);
  });
});
