import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_COMPLETE } from '@moneyball/shared';
import { computeConvergenceRecordFromIsCorrect } from '@/lib/analysis/convergenceRecord';

describe('wave-580: computeConvergenceRecordFromIsCorrect', () => {
  describe('제외 조건', () => {
    it('convergenceNetScore null → 제외', () => {
      const result = computeConvergenceRecordFromIsCorrect(
        [{ convergenceNetScore: null, isCorrect: true }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result).toEqual({ wins: 0, losses: 0, total: 0 });
    });

    it('|convergenceNetScore| < threshold → 제외', () => {
      const result = computeConvergenceRecordFromIsCorrect(
        [
          { convergenceNetScore: FACTOR_PICK_COMPLETE - 1, isCorrect: true },
          { convergenceNetScore: -(FACTOR_PICK_COMPLETE - 1), isCorrect: true },
        ],
        FACTOR_PICK_COMPLETE,
      );
      expect(result).toEqual({ wins: 0, losses: 0, total: 0 });
    });

    it('isCorrect null (미종료) → 제외', () => {
      const result = computeConvergenceRecordFromIsCorrect(
        [{ convergenceNetScore: FACTOR_PICK_COMPLETE, isCorrect: null }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result).toEqual({ wins: 0, losses: 0, total: 0 });
    });

    it('빈 배열 → { wins: 0, losses: 0, total: 0 }', () => {
      expect(computeConvergenceRecordFromIsCorrect([], FACTOR_PICK_COMPLETE)).toEqual({
        wins: 0,
        losses: 0,
        total: 0,
      });
    });
  });

  describe('집계 포함 — 경계값', () => {
    it('|convergenceNetScore| = threshold → 포함', () => {
      const result = computeConvergenceRecordFromIsCorrect(
        [{ convergenceNetScore: FACTOR_PICK_COMPLETE, isCorrect: true }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result).toEqual({ wins: 1, losses: 0, total: 1 });
    });

    it('음수 threshold 충족 + isCorrect true → wins+1', () => {
      const result = computeConvergenceRecordFromIsCorrect(
        [{ convergenceNetScore: -FACTOR_PICK_COMPLETE, isCorrect: true }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result).toEqual({ wins: 1, losses: 0, total: 1 });
    });
  });

  describe('wins / losses 집계', () => {
    it('isCorrect true → wins+1, total+1', () => {
      const result = computeConvergenceRecordFromIsCorrect(
        [{ convergenceNetScore: FACTOR_PICK_COMPLETE, isCorrect: true }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result.wins).toBe(1);
      expect(result.losses).toBe(0);
      expect(result.total).toBe(1);
    });

    it('isCorrect false → losses+1, total+1', () => {
      const result = computeConvergenceRecordFromIsCorrect(
        [{ convergenceNetScore: FACTOR_PICK_COMPLETE, isCorrect: false }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result.wins).toBe(0);
      expect(result.losses).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe('복합 시나리오', () => {
    it('2승 1패 + 제외 조건들 혼합', () => {
      const result = computeConvergenceRecordFromIsCorrect(
        [
          { convergenceNetScore: FACTOR_PICK_COMPLETE, isCorrect: true },      // 포함, win
          { convergenceNetScore: FACTOR_PICK_COMPLETE, isCorrect: false },     // 포함, loss
          { convergenceNetScore: -FACTOR_PICK_COMPLETE, isCorrect: true },     // 포함, win
          { convergenceNetScore: FACTOR_PICK_COMPLETE - 1, isCorrect: true },  // 제외 (임계 미달)
          { convergenceNetScore: null, isCorrect: true },                      // 제외 (null)
          { convergenceNetScore: FACTOR_PICK_COMPLETE, isCorrect: null },      // 제외 (미종료)
        ],
        FACTOR_PICK_COMPLETE,
      );
      expect(result).toEqual({ wins: 2, losses: 1, total: 3 });
    });

    it('wins + losses = total 불변', () => {
      const result = computeConvergenceRecordFromIsCorrect(
        [
          { convergenceNetScore: FACTOR_PICK_COMPLETE + 2, isCorrect: true },
          { convergenceNetScore: FACTOR_PICK_COMPLETE + 3, isCorrect: false },
          { convergenceNetScore: -(FACTOR_PICK_COMPLETE + 1), isCorrect: true },
        ],
        FACTOR_PICK_COMPLETE,
      );
      expect(result.wins + result.losses).toBe(result.total);
    });
  });
});
