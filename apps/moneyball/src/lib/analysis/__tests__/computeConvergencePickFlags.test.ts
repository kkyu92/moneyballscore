import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_STRONG, FACTOR_PICK_COMPLETE } from '@moneyball/shared';
import { computeConvergencePickFlags } from '../convergenceRecord';

// wave-583: computeConvergencePickFlags — wave-579/581 어제/이번주 경기 동일 2줄 패턴 추출

describe('computeConvergencePickFlags', () => {
  describe('null 처리', () => {
    it('null → isTopPick=false, isStrongPick=false', () => {
      expect(computeConvergencePickFlags(null)).toEqual({ isTopPick: false, isStrongPick: false });
    });
  });

  describe('FACTOR_PICK_COMPLETE(10) 완전수렴', () => {
    it('score=10 → isTopPick=true, isStrongPick=true', () => {
      expect(computeConvergencePickFlags(10)).toEqual({ isTopPick: true, isStrongPick: true });
    });

    it('score=-10 → isTopPick=true (절댓값)', () => {
      const { isTopPick } = computeConvergencePickFlags(-10);
      expect(isTopPick).toBe(true);
    });

    it('score=9 → isTopPick=false (COMPLETE 미달)', () => {
      const { isTopPick } = computeConvergencePickFlags(9);
      expect(isTopPick).toBe(false);
    });
  });

  describe('FACTOR_PICK_STRONG(8) 강수렴', () => {
    it('score=8 → isStrongPick=true, isTopPick=false', () => {
      expect(computeConvergencePickFlags(FACTOR_PICK_STRONG)).toEqual({
        isTopPick: false,
        isStrongPick: true,
      });
    });

    it('score=-8 → isStrongPick=true (절댓값)', () => {
      const { isStrongPick } = computeConvergencePickFlags(-8);
      expect(isStrongPick).toBe(true);
    });

    it('score=7 → isStrongPick=false (STRONG 미달)', () => {
      const { isStrongPick } = computeConvergencePickFlags(7);
      expect(isStrongPick).toBe(false);
    });
  });

  describe('FACTOR_PICK_COMPLETE 경계값', () => {
    it(`score=${FACTOR_PICK_COMPLETE} → isTopPick=true`, () => {
      expect(computeConvergencePickFlags(FACTOR_PICK_COMPLETE).isTopPick).toBe(true);
    });

    it(`score=${FACTOR_PICK_COMPLETE - 1} → isTopPick=false`, () => {
      expect(computeConvergencePickFlags(FACTOR_PICK_COMPLETE - 1).isTopPick).toBe(false);
    });
  });
});
