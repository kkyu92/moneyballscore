import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  FACTOR_PICK_STRONG,
  FACTOR_PICK_COMPLETE,
} from '@moneyball/shared';

// wave-476: FACTOR_PICK_STRONG JSDoc wave-475 bullet description line 정정
// Feature-Drift Cycle: explore-idea (wave-475) → review-code (wave-476)
// 수정: |convergenceNetScore| ≥ 본 값 시 text-brand-500 → (isComplete=false 전제) 추가

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

describe('wave-476 — FACTOR_PICK_STRONG JSDoc wave-475 bullet description line 정정', () => {
  it('wave-475 bullet isComplete=false 전제 조건 명시', () => {
    expect(sharedSrc).toContain(
      'wave-475 예정 경기 팩터 N:M 색상 brand 티어 (cycle 1837): |convergenceNetScore| ≥ 본 값 시 text-brand-500 (isComplete=false 전제).',
    );
  });

  it('wave-475 bullet 구 표현 "(isComplete=false 전제)" 없는 버전 제거', () => {
    expect(sharedSrc).not.toContain(
      '|convergenceNetScore| ≥ 본 값 시 text-brand-500.',
    );
  });

  it('description line isComplete=false 전제 일관성 — FACTOR_PICK_STRONG JSDoc', () => {
    expect(sharedSrc).toContain('(isComplete=false 전제)');
  });

  it('FACTOR_PICK_STRONG brand 색상 — isComplete=false 전제 동작 검증', () => {
    // brand 색상은 FACTOR_PICK_COMPLETE 미만일 때만 적용 (isComplete=false 전제)
    const netScore = 8;
    expect(Math.abs(netScore) >= FACTOR_PICK_STRONG).toBe(true);
    expect(Math.abs(netScore) >= FACTOR_PICK_COMPLETE).toBe(false);
    // FACTOR_PICK_COMPLETE 이상이면 amber 우선 — brand 아님
    const netScoreComplete = 10;
    expect(Math.abs(netScoreComplete) >= FACTOR_PICK_COMPLETE).toBe(true);
    expect(Math.abs(netScoreComplete) >= FACTOR_PICK_STRONG).toBe(true); // >= STRONG이지만 amber 우선
  });
});
