import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  TOPFACTOR_STRONG_IMPACT,
  TOPFACTOR_COMPLETE_IMPACT,
  NEUTRAL_FACTOR,
} from '@moneyball/shared';

// wave-469: 분석 목록 메인 게임 카드 topFactors 배지 3-tier 색상

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);
const analysisListSrc = readFileSync(
  join(__dirname, '../analysis/page.tsx'),
  'utf8',
);

describe('wave-469 — topFactors 배지 3-tier 색상', () => {
  it('TOPFACTOR_STRONG_IMPACT 는 NEUTRAL_FACTOR 기준 양수 임계 (0~0.5 범위)', () => {
    expect(TOPFACTOR_STRONG_IMPACT).toBeGreaterThan(0);
    expect(TOPFACTOR_STRONG_IMPACT).toBeLessThan(0.5);
  });

  it('TOPFACTOR_COMPLETE_IMPACT > TOPFACTOR_STRONG_IMPACT', () => {
    expect(TOPFACTOR_COMPLETE_IMPACT).toBeGreaterThan(TOPFACTOR_STRONG_IMPACT);
    expect(TOPFACTOR_COMPLETE_IMPACT).toBeLessThan(0.5);
  });

  it('TOPFACTOR_COMPLETE_IMPACT JSDoc 에 wave-469 참조 존재', () => {
    expect(sharedSrc).toContain('wave-469');
    expect(sharedSrc).toContain('TOPFACTOR_COMPLETE_IMPACT');
  });

  it('TodayGameCard.topFactors type 에 impact 필드 포함', () => {
    expect(analysisListSrc).toContain('impact: number');
  });

  it('analysis/page.tsx 가 TOPFACTOR_COMPLETE_IMPACT 와 TOPFACTOR_STRONG_IMPACT import', () => {
    expect(analysisListSrc).toContain('TOPFACTOR_COMPLETE_IMPACT');
    expect(analysisListSrc).toContain('TOPFACTOR_STRONG_IMPACT');
  });

  it('amber tier: impact >= TOPFACTOR_COMPLETE_IMPACT 조건 렌더링 존재', () => {
    expect(analysisListSrc).toContain('f.impact >= TOPFACTOR_COMPLETE_IMPACT');
    expect(analysisListSrc).toContain('text-amber-700 dark:text-amber-300');
  });

  it('brand tier: impact >= TOPFACTOR_STRONG_IMPACT 조건 렌더링 존재', () => {
    expect(analysisListSrc).toContain('f.impact >= TOPFACTOR_STRONG_IMPACT');
    expect(analysisListSrc).toContain('text-brand-600 dark:text-brand-400');
  });

  it('topFactors push 시 impact 필드 박제', () => {
    expect(analysisListSrc).toContain('impact: f.impact');
  });

  it('wave-469 주석 분석 목록에 존재', () => {
    expect(analysisListSrc).toContain('wave-469');
  });

  it('NEUTRAL_FACTOR 는 0.5 (factor 중립값 기준 검증)', () => {
    expect(NEUTRAL_FACTOR).toBe(0.5);
  });
});
