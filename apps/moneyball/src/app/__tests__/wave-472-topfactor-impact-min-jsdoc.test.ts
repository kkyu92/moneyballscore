import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  TOPFACTOR_IMPACT_MIN_DISPLAY,
} from '@moneyball/shared';

// wave-472: TOPFACTOR_IMPACT_MIN_DISPLAY JSDoc wave-471 description line 정정
// Feature-Drift Cycle: explore-idea (wave-471) → review-code (wave-472)

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

describe('wave-472 — TOPFACTOR_IMPACT_MIN_DISPLAY JSDoc description line 정정', () => {
  it('TOPFACTOR_IMPACT_MIN_DISPLAY JSDoc 에 수치 노출 임계 설명 존재', () => {
    expect(sharedSrc).toContain('수치 노출 임계');
  });

  it('TOPFACTOR_IMPACT_MIN_DISPLAY JSDoc "%p 수치 표시 최소 임계" 표현 제거', () => {
    expect(sharedSrc).not.toContain('%p 수치 표시 최소 임계');
  });

  it('TOPFACTOR_IMPACT_MIN_DISPLAY JSDoc impactPp 계산식 명시', () => {
    expect(sharedSrc).toContain('impactPp=Math.round(impact*100)');
  });

  it('TOPFACTOR_IMPACT_MIN_DISPLAY JSDoc callsite 동시 조정 안내 존재', () => {
    expect(sharedSrc).toContain('wave-471 impact 수치 callsite 동시 조정');
  });

  it('TOPFACTOR_IMPACT_MIN_DISPLAY 임계 수학 검증 — impactPp = Math.round(0.05 * 100) = 5', () => {
    expect(Math.round(TOPFACTOR_IMPACT_MIN_DISPLAY * 100)).toBe(5);
  });
});
