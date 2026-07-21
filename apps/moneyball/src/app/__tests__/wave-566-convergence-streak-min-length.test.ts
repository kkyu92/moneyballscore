import { describe, it, expect } from 'vitest';
import { computeConvergenceStreak, computeConvergenceBestStreak } from '@/lib/analysis/convergenceRecord';
import { CONVERGENCE_STREAK_MIN_LENGTH } from '@moneyball/shared';

// wave-566: CONVERGENCE_STREAK_MIN_LENGTH 상수화 guard
// convergenceRecord.ts: computeConvergenceStreak + computeConvergenceBestStreak 양쪽 공통 기준
//
// 불변:
//   - CONVERGENCE_STREAK_MIN_LENGTH = 2 (1경기 단발은 streak 아님)
//   - 두 함수 모두 results.length < CONVERGENCE_STREAK_MIN_LENGTH 경기 단발 → null
//   - 경계값 CONVERGENCE_STREAK_MIN_LENGTH - 1 = 1연 → null
//   - 경계값 CONVERGENCE_STREAK_MIN_LENGTH = 2연 → non-null

describe('wave-566: CONVERGENCE_STREAK_MIN_LENGTH 상수 guard', () => {
  describe('상수 정합', () => {
    it('CONVERGENCE_STREAK_MIN_LENGTH = 2', () => {
      expect(CONVERGENCE_STREAK_MIN_LENGTH).toBe(2);
    });
  });

  describe('computeConvergenceStreak — CONVERGENCE_STREAK_MIN_LENGTH 경계', () => {
    it('length < CONVERGENCE_STREAK_MIN_LENGTH (1경기) → null', () => {
      expect(computeConvergenceStreak([true])).toBeNull();
      expect(computeConvergenceStreak([false])).toBeNull();
    });

    it('length = CONVERGENCE_STREAK_MIN_LENGTH (2연승) → non-null', () => {
      const result = computeConvergenceStreak([true, true]);
      expect(result).not.toBeNull();
      expect(result?.length).toBe(CONVERGENCE_STREAK_MIN_LENGTH);
    });

    it('length = CONVERGENCE_STREAK_MIN_LENGTH (2연패) → non-null', () => {
      const result = computeConvergenceStreak([false, false]);
      expect(result).not.toBeNull();
      expect(result?.length).toBe(CONVERGENCE_STREAK_MIN_LENGTH);
    });
  });

  describe('computeConvergenceBestStreak — CONVERGENCE_STREAK_MIN_LENGTH 경계', () => {
    it('best < CONVERGENCE_STREAK_MIN_LENGTH (1경기 단발) → null', () => {
      expect(computeConvergenceBestStreak([true])).toBeNull();
      expect(computeConvergenceBestStreak([false])).toBeNull();
    });

    it('best = CONVERGENCE_STREAK_MIN_LENGTH (2연승) → non-null', () => {
      const result = computeConvergenceBestStreak([true, true]);
      expect(result).not.toBeNull();
      expect(result?.length).toBe(CONVERGENCE_STREAK_MIN_LENGTH);
    });

    it('1승 1패 교대 → best=1 < CONVERGENCE_STREAK_MIN_LENGTH → null', () => {
      expect(computeConvergenceBestStreak([true, false, true, false])).toBeNull();
    });
  });
});
