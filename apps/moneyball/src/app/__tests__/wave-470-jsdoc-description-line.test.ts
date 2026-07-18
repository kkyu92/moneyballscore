import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  TOPFACTOR_STRONG_IMPACT,
  TOPFACTOR_COMPLETE_IMPACT,
  NEUTRAL_FACTOR,
} from '@moneyball/shared';

// wave-470: TOPFACTOR_STRONG_IMPACT JSDoc wave-469 description line 정정
// Feature-Drift Cycle: explore-idea (wave-469) → review-code (wave-470)

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

describe('wave-470 — TOPFACTOR_STRONG_IMPACT JSDoc description line 정정', () => {
  it('TOPFACTOR_STRONG_IMPACT JSDoc 에 brand 임계 설명 존재', () => {
    expect(sharedSrc).toContain('brand 임계');
  });

  it('TOPFACTOR_STRONG_IMPACT JSDoc 에 factor value 범위 설명 존재 (≥ 0.68 or ≤ 0.32)', () => {
    expect(sharedSrc).toContain('factor value ≥ 0.68 or ≤ 0.32');
  });

  it('TOPFACTOR_STRONG_IMPACT 임계 수학 검증 — |0.68 - NEUTRAL_FACTOR| = 0.18', () => {
    expect(Math.abs(0.68 - NEUTRAL_FACTOR)).toBeCloseTo(TOPFACTOR_STRONG_IMPACT, 10);
    expect(Math.abs(0.32 - NEUTRAL_FACTOR)).toBeCloseTo(TOPFACTOR_STRONG_IMPACT, 10);
  });

  it('TOPFACTOR_STRONG_IMPACT 와 TOPFACTOR_COMPLETE_IMPACT JSDoc 대칭 — 양쪽 모두 factor value 범위 설명 포함', () => {
    expect(sharedSrc).toContain('factor value ≥ 0.68 or ≤ 0.32');
    expect(sharedSrc).toContain('factor value ≥ 0.80 or ≤ 0.20');
  });

  it('TOPFACTOR_COMPLETE_IMPACT JSDoc amber 임계 설명 유지', () => {
    expect(sharedSrc).toContain('amber 임계');
    expect(sharedSrc).toContain('factor value ≥ 0.80 or ≤ 0.20');
  });
});
