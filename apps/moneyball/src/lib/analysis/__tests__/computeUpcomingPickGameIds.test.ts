import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_STRONG, FACTOR_PICK_COMPLETE, FACTOR_PICK_MIN_FACTORS } from '@moneyball/shared';
import { computeUpcomingPickGameIds } from '../convergenceRecord';

// wave-578: computeUpcomingPickGameIds 순수 함수 — threshold 파라미터화 (wave-525/577 동일 패턴 통합)

describe('computeUpcomingPickGameIds', () => {
  describe('threshold 파라미터화', () => {
    it('threshold=FACTOR_PICK_STRONG(8), score=9 → 포함', () => {
      const result = computeUpcomingPickGameIds(
        [{ gameId: 1, convergenceNetScore: 9 }],
        FACTOR_PICK_STRONG,
      );
      expect(result).toEqual(new Set([1]));
    });

    it('threshold=FACTOR_PICK_COMPLETE(10), score=9 → 제외', () => {
      const result = computeUpcomingPickGameIds(
        [{ gameId: 1, convergenceNetScore: 9 }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result.size).toBe(0);
    });

    it('threshold=FACTOR_PICK_COMPLETE(10), score=10 → 포함', () => {
      const result = computeUpcomingPickGameIds(
        [{ gameId: 2, convergenceNetScore: 10 }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result).toEqual(new Set([2]));
    });
  });

  describe('음수 score 절댓값 처리', () => {
    it('음수 score -9 → FACTOR_PICK_STRONG 포함', () => {
      const result = computeUpcomingPickGameIds(
        [{ gameId: 3, convergenceNetScore: -9 }],
        FACTOR_PICK_STRONG,
      );
      expect(result).toEqual(new Set([3]));
    });

    it('음수 score -10 → FACTOR_PICK_COMPLETE 포함', () => {
      const result = computeUpcomingPickGameIds(
        [{ gameId: 4, convergenceNetScore: -10 }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result).toEqual(new Set([4]));
    });
  });

  describe('null 처리', () => {
    it('convergenceNetScore null → 제외', () => {
      const result = computeUpcomingPickGameIds(
        [{ gameId: 5, convergenceNetScore: null }],
        FACTOR_PICK_MIN_FACTORS,
      );
      expect(result.size).toBe(0);
    });
  });

  describe('복수 경기', () => {
    it('경기 3개 중 threshold 이상 2개만 포함', () => {
      const games = [
        { gameId: 10, convergenceNetScore: 10 },
        { gameId: 11, convergenceNetScore: 7 },
        { gameId: 12, convergenceNetScore: 9 },
      ];
      const result = computeUpcomingPickGameIds(games, FACTOR_PICK_STRONG);
      expect(result).toEqual(new Set([10, 12]));
    });

    it('빈 배열 → 빈 Set', () => {
      expect(computeUpcomingPickGameIds([], FACTOR_PICK_STRONG).size).toBe(0);
    });
  });
});
