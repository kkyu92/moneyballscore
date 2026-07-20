import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_STRONG, FACTOR_PICK_COMPLETE } from '@moneyball/shared';

// wave-550: 어제 경기 강수렴 픽 배지 guard
// YesterdayGameCard.convergenceNetScore → ★/⚡ 배지 렌더 조건 문서화.
//
// ★ TOP픽: |netScore| >= FACTOR_PICK_COMPLETE(10)
// ⚡ 강수렴 픽: |netScore| >= FACTOR_PICK_STRONG(8), !TOP픽
// 배지 없음: |netScore| < FACTOR_PICK_STRONG, 또는 null

function classifyYesterdayBadge(convergenceNetScore: number | null): 'top' | 'strong' | 'none' {
  if (convergenceNetScore == null) return 'none';
  const abs = Math.abs(convergenceNetScore);
  if (abs >= FACTOR_PICK_COMPLETE) return 'top';
  if (abs >= FACTOR_PICK_STRONG) return 'strong';
  return 'none';
}

describe('wave-550: 어제 경기 강수렴 픽 배지 — netScore → ★/⚡/없음', () => {
  describe('★ TOP픽 조건 (|netScore| >= FACTOR_PICK_COMPLETE)', () => {
    it('netScore=10 (완전 수렴) → top', () => {
      expect(classifyYesterdayBadge(10)).toBe('top');
    });

    it('netScore=-10 (원정 완전 수렴) → top', () => {
      expect(classifyYesterdayBadge(-10)).toBe('top');
    });

    it('netScore=12 (초과) → top', () => {
      expect(classifyYesterdayBadge(12)).toBe('top');
    });
  });

  describe('⚡ 강수렴 픽 조건 (|netScore| >= FACTOR_PICK_STRONG, < COMPLETE)', () => {
    it('netScore=8 (강수렴 경계) → strong', () => {
      expect(classifyYesterdayBadge(8)).toBe('strong');
    });

    it('netScore=-8 (원정 강수렴) → strong', () => {
      expect(classifyYesterdayBadge(-8)).toBe('strong');
    });

    it('netScore=9 (강수렴) → strong', () => {
      expect(classifyYesterdayBadge(9)).toBe('strong');
    });

    it('netScore=-9 (원정 강수렴) → strong', () => {
      expect(classifyYesterdayBadge(-9)).toBe('strong');
    });
  });

  describe('배지 없음 조건', () => {
    it('netScore=null (데이터 부족) → none', () => {
      expect(classifyYesterdayBadge(null)).toBe('none');
    });

    it('netScore=7 (FACTOR_PICK_STRONG 미달) → none', () => {
      expect(classifyYesterdayBadge(7)).toBe('none');
    });

    it('netScore=-7 → none', () => {
      expect(classifyYesterdayBadge(-7)).toBe('none');
    });

    it('netScore=0 → none', () => {
      expect(classifyYesterdayBadge(0)).toBe('none');
    });

    it('netScore=1 → none', () => {
      expect(classifyYesterdayBadge(1)).toBe('none');
    });
  });

  describe('FACTOR_PICK_STRONG/COMPLETE 상수 정합 확인', () => {
    it('FACTOR_PICK_COMPLETE >= FACTOR_PICK_STRONG (TOP > strong 계층 유지)', () => {
      expect(FACTOR_PICK_COMPLETE).toBeGreaterThanOrEqual(FACTOR_PICK_STRONG);
    });

    it('FACTOR_PICK_STRONG > 0 (양수)', () => {
      expect(FACTOR_PICK_STRONG).toBeGreaterThan(0);
    });

    it('TOP픽 경계값은 strong 도 충족 (inclusive)', () => {
      // FACTOR_PICK_COMPLETE 값은 TOP픽이면서 strong 조건도 충족해야
      expect(FACTOR_PICK_COMPLETE).toBeGreaterThanOrEqual(FACTOR_PICK_STRONG);
      // classifyYesterdayBadge 는 top 우선 → COMPLETE 이상은 항상 'top' 반환
      expect(classifyYesterdayBadge(FACTOR_PICK_COMPLETE)).toBe('top');
    });
  });
});
