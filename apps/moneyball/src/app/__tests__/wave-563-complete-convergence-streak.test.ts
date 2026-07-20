import { describe, it, expect } from 'vitest';
import { computeConvergenceStreak } from '@/lib/analysis/convergenceRecord';
import { FACTOR_PICK_COMPLETE, FACTOR_PICK_STRONG } from '@moneyball/shared';

// wave-563: 완전수렴 픽 연속 streak 배지 guard
// analysis/page.tsx: getConvergencePickStreak(FACTOR_PICK_COMPLETE) → completeConvergenceStreak
//
// 불변:
//   - FACTOR_PICK_COMPLETE(10) > FACTOR_PICK_STRONG(8) — 완전수렴은 강수렴보다 엄격
//   - streak 표시 조건: completeConvergenceStreak !== null (length >= 2)
//   - wave-552(강수렴) 동일 함수(computeConvergenceStreak), 임계값만 다름
//   - 2연승 이상 🔥 / 2연패 이상 ❄️ — 1연은 null 반환

describe('wave-563: complete convergence streak', () => {
  describe('FACTOR_PICK_COMPLETE 상수 정합', () => {
    it('FACTOR_PICK_COMPLETE = 10', () => {
      expect(FACTOR_PICK_COMPLETE).toBe(10);
    });

    it('FACTOR_PICK_COMPLETE > FACTOR_PICK_STRONG — 완전수렴은 강수렴보다 엄격', () => {
      expect(FACTOR_PICK_COMPLETE).toBeGreaterThan(FACTOR_PICK_STRONG);
    });
  });

  describe('streak 최소 길이 guard (wave-552 동일 함수)', () => {
    it('빈 배열 → null', () => {
      expect(computeConvergenceStreak([])).toBeNull();
    });

    it('1경기 → null (단발은 streak 아님)', () => {
      expect(computeConvergenceStreak([true])).toBeNull();
      expect(computeConvergenceStreak([false])).toBeNull();
    });

    it('2연승 → { type: win, length: 2 } — 배지 표시 최소 조건', () => {
      expect(computeConvergenceStreak([true, true])).toEqual({ type: 'win', length: 2 });
    });

    it('2연패 → { type: loss, length: 2 }', () => {
      expect(computeConvergenceStreak([false, false])).toEqual({ type: 'loss', length: 2 });
    });
  });

  describe('FACTOR_PICK_COMPLETE 기준 필터 패턴', () => {
    it('FACTOR_PICK_COMPLETE(10) 통과 결과 3연승 → { type: win, length: 3 }', () => {
      // getConvergencePickStreak(FACTOR_PICK_COMPLETE) 에서 |netScore| >= 10 필터 후 전달
      const filteredResults = [true, true, true];
      expect(computeConvergenceStreak(filteredResults)).toEqual({ type: 'win', length: 3 });
    });

    it('FACTOR_PICK_COMPLETE(10) 기준 — FACTOR_PICK_STRONG(8)보다 경기 수 적을 수 있음', () => {
      // 완전수렴은 더 엄격한 필터 → 샘플 수 적을 수 있음 — null 반환 정상
      expect(computeConvergenceStreak([])).toBeNull();
    });
  });
});
