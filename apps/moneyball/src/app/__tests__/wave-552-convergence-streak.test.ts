import { describe, it, expect } from 'vitest';
import { computeConvergenceStreak } from '@/lib/analysis/convergenceRecord';
import { FACTOR_PICK_STRONG } from '@moneyball/shared';

// wave-552: 강수렴 픽 연속 streak 배지
// computeConvergenceStreak(results: boolean[]) → { type: 'win' | 'loss', length: number } | null
//
// 불변:
//   - 최신순 정렬 배열 기준 선두부터 연속 동일 결과 카운트
//   - 연속 2경기 미만 → null (단발 결과는 streak X)
//   - 빈 배열 → null
//   - type='win' 조건: results[0]===true + length >= 2
//   - type='loss' 조건: results[0]===false + length >= 2
//
// UI 표시 조건:
//   convergenceStreak !== null → 🔥 N연승 (win) 또는 ❄️ N연패 (loss)
//   FACTOR_PICK_STRONG(8) 필터 적용

describe('wave-552: computeConvergenceStreak', () => {
  describe('null 반환 케이스', () => {
    it('빈 배열 → null', () => {
      expect(computeConvergenceStreak([])).toBeNull();
    });

    it('결과 1건 → null (단발 streak 아님)', () => {
      expect(computeConvergenceStreak([true])).toBeNull();
      expect(computeConvergenceStreak([false])).toBeNull();
    });

    it('win 후 loss → null (단발 win)', () => {
      expect(computeConvergenceStreak([true, false])).toBeNull();
    });

    it('loss 후 win → null (단발 loss)', () => {
      expect(computeConvergenceStreak([false, true])).toBeNull();
    });

    it('단발 win 다수 — 연속 아닌 경우', () => {
      // W L W L W → 최신(첫번째)=W, 다음=L → 연속 1 → null
      expect(computeConvergenceStreak([true, false, true, false, true])).toBeNull();
    });
  });

  describe('win streak 반환 케이스', () => {
    it('2연승 → { type: win, length: 2 }', () => {
      const result = computeConvergenceStreak([true, true]);
      expect(result).toEqual({ type: 'win', length: 2 });
    });

    it('3연승 → { type: win, length: 3 }', () => {
      const result = computeConvergenceStreak([true, true, true]);
      expect(result).toEqual({ type: 'win', length: 3 });
    });

    it('5연승 후 패 → { type: win, length: 5 }', () => {
      const result = computeConvergenceStreak([true, true, true, true, true, false]);
      expect(result).toEqual({ type: 'win', length: 5 });
    });

    it('7연승 → { type: win, length: 7 }', () => {
      const result = computeConvergenceStreak([true, true, true, true, true, true, true]);
      expect(result).toEqual({ type: 'win', length: 7 });
    });
  });

  describe('loss streak 반환 케이스', () => {
    it('2연패 → { type: loss, length: 2 }', () => {
      const result = computeConvergenceStreak([false, false]);
      expect(result).toEqual({ type: 'loss', length: 2 });
    });

    it('3연패 → { type: loss, length: 3 }', () => {
      const result = computeConvergenceStreak([false, false, false]);
      expect(result).toEqual({ type: 'loss', length: 3 });
    });

    it('4연패 후 승 → { type: loss, length: 4 }', () => {
      const result = computeConvergenceStreak([false, false, false, false, true]);
      expect(result).toEqual({ type: 'loss', length: 4 });
    });
  });

  describe('streak 끝 이후 결과 무시', () => {
    it('2연승 → 패 반복 — streak=2, 이후 패 무시', () => {
      const result = computeConvergenceStreak([true, true, false, false, false]);
      expect(result).toEqual({ type: 'win', length: 2 });
    });

    it('3연패 → 승 반복 — streak=3, 이후 승 무시', () => {
      const result = computeConvergenceStreak([false, false, false, true, true, true]);
      expect(result).toEqual({ type: 'loss', length: 3 });
    });
  });

  describe('FACTOR_PICK_STRONG 연계 — streak 길이 확인', () => {
    it('streak length >= 2 항상 표시 조건 충족', () => {
      const streak = computeConvergenceStreak([true, true]);
      expect(streak).not.toBeNull();
      expect(streak!.length).toBeGreaterThanOrEqual(2);
    });

    it('FACTOR_PICK_STRONG(8) 기준 필터 통과한 결과로만 streak 계산됨 — 외부 필터 책임', () => {
      // getConvergencePickStreak 에서 |netScore| >= FACTOR_PICK_STRONG(8) 필터 후 computeConvergenceStreak 호출
      // 본 함수는 이미 필터된 bool[] 만 받으므로 FACTOR_PICK_STRONG 값 직접 사용 X
      // 이 테스트는 필터 후 결과 전달 패턴 확인
      expect(FACTOR_PICK_STRONG).toBe(8); // 상수 확인
      const filteredResults = [true, true, true]; // |netScore| >= 8 통과한 최근 3경기 3승
      const result = computeConvergenceStreak(filteredResults);
      expect(result).toEqual({ type: 'win', length: 3 });
    });
  });
});
