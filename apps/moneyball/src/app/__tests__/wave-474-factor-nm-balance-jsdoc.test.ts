import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  FACTOR_PICK_MIN_FACTORS,
} from '@moneyball/shared';

// wave-474: FACTOR_PICK_MIN_FACTORS JSDoc wave-473 bullet description line 정정
// Feature-Drift Cycle: explore-idea (wave-473) → review-code (wave-474)

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

describe('wave-474 — FACTOR_PICK_MIN_FACTORS JSDoc wave-473 bullet description line 정정', () => {
  it('wave-473 bullet 제목 "팩터 N:M 균형 표시 확장" 존재', () => {
    expect(sharedSrc).toContain('wave-473 팩터 N:M 균형 표시 확장');
  });

  it('wave-473 bullet 구 표현 "이 임계 미달 경기에도...gray 색상으로" 제거', () => {
    expect(sharedSrc).not.toContain('이 임계 미달 경기에도');
    expect(sharedSrc).not.toContain('산출 후 gray 색상으로');
  });

  it('wave-473 bullet favored-first 포맷 명시', () => {
    expect(sharedSrc).toContain('favored-first 포맷');
  });

  it('wave-473 bullet isPickGame colored·bold / 비수렴 gray 양 경로 명시', () => {
    expect(sharedSrc).toContain('isPickGame colored·bold');
    expect(sharedSrc).toContain('비수렴 gray');
  });

  it('wave-473 bullet callsite 동시 조정 안내 존재', () => {
    expect(sharedSrc).toContain('wave-415·473 factorHasData callsite 동시 조정');
  });

  it('FACTOR_PICK_MIN_FACTORS 임계 값 수렴 픽 isPickGame 기준 유지', () => {
    expect(FACTOR_PICK_MIN_FACTORS).toBe(7);
    // wave-473 factorFavoredCount != null 확장 후에도 isPickGame 기준(≥7) 유지
    const nonConvergenceNetScore = 4;
    const convergenceNetScore = 8;
    expect(Math.abs(nonConvergenceNetScore) >= FACTOR_PICK_MIN_FACTORS).toBe(false);
    expect(Math.abs(convergenceNetScore) >= FACTOR_PICK_MIN_FACTORS).toBe(true);
  });
});
