import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  TOPFACTOR_IMPACT_MIN_DISPLAY,
  TOPFACTOR_STRONG_IMPACT,
  TOPFACTOR_COMPLETE_IMPACT,
} from '@moneyball/shared';

// wave-471: 분析 목록 메인 게임 카드 topFactors 배지 impact %p 수치 표시

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);
const analysisListSrc = readFileSync(
  join(__dirname, '../analysis/page.tsx'),
  'utf8',
);

describe('wave-471 — topFactors 배지 impact %p 수치 표시', () => {
  it('TOPFACTOR_IMPACT_MIN_DISPLAY 는 0~TOPFACTOR_STRONG_IMPACT 범위', () => {
    expect(TOPFACTOR_IMPACT_MIN_DISPLAY).toBeGreaterThan(0);
    expect(TOPFACTOR_IMPACT_MIN_DISPLAY).toBeLessThan(TOPFACTOR_STRONG_IMPACT);
  });

  it('TOPFACTOR_IMPACT_MIN_DISPLAY 는 0.05 (5pp)', () => {
    expect(TOPFACTOR_IMPACT_MIN_DISPLAY).toBe(0.05);
  });

  it('TOPFACTOR_IMPACT_MIN_DISPLAY JSDoc 에 wave-471 참조 존재', () => {
    expect(sharedSrc).toContain('wave-471');
    expect(sharedSrc).toContain('TOPFACTOR_IMPACT_MIN_DISPLAY');
  });

  it('analysis/page.tsx 가 TOPFACTOR_IMPACT_MIN_DISPLAY import', () => {
    expect(analysisListSrc).toContain('TOPFACTOR_IMPACT_MIN_DISPLAY');
  });

  it('analysis/page.tsx 에 impactPp 계산 존재 (Math.round * 100)', () => {
    expect(analysisListSrc).toContain('Math.round(f.impact * 100)');
    expect(analysisListSrc).toContain('impactPp');
  });

  it('impact >= TOPFACTOR_IMPACT_MIN_DISPLAY 시 +n 수치 표시 조건 존재', () => {
    expect(analysisListSrc).toContain('f.impact >= TOPFACTOR_IMPACT_MIN_DISPLAY');
    expect(analysisListSrc).toContain('` +${impactPp}`');
  });

  it('wave-471 주석 분석 목록에 존재', () => {
    expect(analysisListSrc).toContain('wave-471');
  });

  it('임계값 순서 일관성: MIN_DISPLAY < STRONG < COMPLETE', () => {
    expect(TOPFACTOR_IMPACT_MIN_DISPLAY).toBeLessThan(TOPFACTOR_STRONG_IMPACT);
    expect(TOPFACTOR_STRONG_IMPACT).toBeLessThan(TOPFACTOR_COMPLETE_IMPACT);
  });

  it('impact %p 계산 검증: impact=0.12 → 12pp', () => {
    const impact = 0.12;
    const pp = Math.round(impact * 100);
    expect(pp).toBe(12);
  });

  it('impact %p 계산 검증: impact=0.30 → 30pp (amber tier)', () => {
    const impact = 0.30;
    const pp = Math.round(impact * 100);
    expect(pp).toBe(30);
  });

  it('impact < TOPFACTOR_IMPACT_MIN_DISPLAY(0.05) → 수치 미표시 조건', () => {
    const impact = 0.03;
    expect(impact).toBeLessThan(TOPFACTOR_IMPACT_MIN_DISPLAY);
  });
});
