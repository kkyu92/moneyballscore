import { describe, it, expect } from 'vitest';
import { computeConvergenceStreak, computeConvergenceBestStreak } from '@/lib/analysis/convergenceRecord';
import { FACTOR_PICK_STRONG, FACTOR_PICK_MIN_FACTORS } from '@moneyball/shared';

// wave-555: getConvergencePickStreak default param 동기 guard
//
// 불변:
//   - getConvergencePickStreak default = FACTOR_PICK_STRONG(8)
//     (wave-552 callsite: analysis/page.tsx getConvergencePickStreak(FACTOR_PICK_STRONG) 명시)
//     (wave-554 getConvergencePickBestStreak default = FACTOR_PICK_STRONG — 동일 기준)
//   - FACTOR_PICK_STRONG(8) > FACTOR_PICK_MIN_FACTORS(7) — streak 쌍 임계 정합
//   - computeConvergenceBestStreak 동점 시 win 우선 (comment 정합)

describe('wave-555: convergenceStreak default param guard', () => {
  it('FACTOR_PICK_STRONG > FACTOR_PICK_MIN_FACTORS — streak 임계 방향 정합', () => {
    expect(FACTOR_PICK_STRONG).toBeGreaterThan(FACTOR_PICK_MIN_FACTORS);
    expect(FACTOR_PICK_STRONG).toBe(8);
    expect(FACTOR_PICK_MIN_FACTORS).toBe(7);
  });

  describe('computeConvergenceBestStreak — 동점 시 win 우선 (comment 정합)', () => {
    it('3연승 == 3연패 → win 우선', () => {
      // 최신순: 승승승패패패
      const result = computeConvergenceBestStreak([true, true, true, false, false, false]);
      expect(result).toEqual({ type: 'win', length: 3 });
    });

    it('2연승 == 2연패 → win 우선', () => {
      const result = computeConvergenceBestStreak([true, true, false, false]);
      expect(result).toEqual({ type: 'win', length: 2 });
    });

    it('패 최장 > 승 최장 → loss 반환 (win 우선 아님)', () => {
      // 3연패 > 2연승
      const result = computeConvergenceBestStreak([true, true, false, false, false]);
      expect(result).toEqual({ type: 'loss', length: 3 });
    });
  });

  describe('computeConvergenceStreak + computeConvergenceBestStreak 관계', () => {
    it('현재 streak length ≤ best streak length (best >= current 불변)', () => {
      // 최신순: 2연승 (현재) + 과거 4연승
      const results = [true, true, false, true, true, true, true, false];
      const current = computeConvergenceStreak(results);
      const best = computeConvergenceBestStreak(results);
      expect(current).toEqual({ type: 'win', length: 2 });
      expect(best).toEqual({ type: 'win', length: 4 });
      expect(best!.length).toBeGreaterThanOrEqual(current!.length);
    });

    it('현재 streak 이 최장 — current.length == best.length', () => {
      // 5연승 (현재), 과거 2연승
      const results = [true, true, true, true, true, false, true, true, false];
      const current = computeConvergenceStreak(results);
      const best = computeConvergenceBestStreak(results);
      expect(current).toEqual({ type: 'win', length: 5 });
      expect(best).toEqual({ type: 'win', length: 5 });
    });
  });
});
