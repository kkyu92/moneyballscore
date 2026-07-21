import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_MIN_FACTORS, FACTOR_PICK_STRONG, FACTOR_PICK_COMPLETE } from '@moneyball/shared';
import { computeWeeklyConvergenceRecord } from '../convergenceRecord';

// wave-568: computeWeeklyConvergenceRecord 순수 함수 — threshold 파라미터화 (wave-405/541/567 통합)

describe('computeWeeklyConvergenceRecord', () => {
  describe('threshold 파라미터화', () => {
    const game = { convergenceNetScore: 9, homeScore: 5, awayScore: 3 }; // 9 = STRONG but not COMPLETE

    it('threshold=FACTOR_PICK_MIN_FACTORS(7) → 포함', () => {
      expect(computeWeeklyConvergenceRecord([game], FACTOR_PICK_MIN_FACTORS)).toEqual({ wins: 1, losses: 0 });
    });

    it('threshold=FACTOR_PICK_STRONG(8) → 포함', () => {
      expect(computeWeeklyConvergenceRecord([game], FACTOR_PICK_STRONG)).toEqual({ wins: 1, losses: 0 });
    });

    it('threshold=FACTOR_PICK_COMPLETE(10) → 제외 (9 < 10)', () => {
      expect(computeWeeklyConvergenceRecord([game], FACTOR_PICK_COMPLETE)).toEqual({ wins: 0, losses: 0 });
    });
  });

  describe('빈 배열', () => {
    it('경기 없음 → { wins: 0, losses: 0 }', () => {
      expect(computeWeeklyConvergenceRecord([], FACTOR_PICK_MIN_FACTORS)).toEqual({ wins: 0, losses: 0 });
    });
  });

  describe('집계 제외 조건', () => {
    it('convergenceNetScore null → 제외', () => {
      expect(computeWeeklyConvergenceRecord(
        [{ convergenceNetScore: null, homeScore: 5, awayScore: 3 }],
        FACTOR_PICK_MIN_FACTORS,
      )).toEqual({ wins: 0, losses: 0 });
    });

    it('homeScore null → 제외', () => {
      expect(computeWeeklyConvergenceRecord(
        [{ convergenceNetScore: FACTOR_PICK_MIN_FACTORS, homeScore: null, awayScore: null }],
        FACTOR_PICK_MIN_FACTORS,
      )).toEqual({ wins: 0, losses: 0 });
    });
  });

  describe('방향성', () => {
    it('양수 score → 홈 우세, 홈 승 → wins+1', () => {
      expect(computeWeeklyConvergenceRecord(
        [{ convergenceNetScore: FACTOR_PICK_MIN_FACTORS, homeScore: 5, awayScore: 3 }],
        FACTOR_PICK_MIN_FACTORS,
      )).toEqual({ wins: 1, losses: 0 });
    });

    it('음수 score → 어웨이 우세, 어웨이 승 → wins+1', () => {
      expect(computeWeeklyConvergenceRecord(
        [{ convergenceNetScore: -FACTOR_PICK_MIN_FACTORS, homeScore: 2, awayScore: 6 }],
        FACTOR_PICK_MIN_FACTORS,
      )).toEqual({ wins: 1, losses: 0 });
    });

    it('양수 score → 홈 우세, 어웨이 승 → losses+1', () => {
      expect(computeWeeklyConvergenceRecord(
        [{ convergenceNetScore: FACTOR_PICK_MIN_FACTORS, homeScore: 1, awayScore: 4 }],
        FACTOR_PICK_MIN_FACTORS,
      )).toEqual({ wins: 0, losses: 1 });
    });
  });
});
