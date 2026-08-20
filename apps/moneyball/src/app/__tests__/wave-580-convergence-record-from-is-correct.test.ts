import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_COMPLETE } from '@moneyball/shared';
import { computeConvergenceRecordFromScores } from '@/lib/analysis/convergenceRecord';

describe('wave-580/cycle-2299: computeConvergenceRecordFromScores', () => {
  describe('제외 조건', () => {
    it('convergenceNetScore null → 제외', () => {
      const result = computeConvergenceRecordFromScores(
        [{ convergenceNetScore: null, homeScore: 5, awayScore: 2 }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result).toEqual({ wins: 0, losses: 0, total: 0 });
    });

    it('|convergenceNetScore| < threshold → 제외', () => {
      const result = computeConvergenceRecordFromScores(
        [
          { convergenceNetScore: FACTOR_PICK_COMPLETE - 1, homeScore: 5, awayScore: 2 },
          { convergenceNetScore: -(FACTOR_PICK_COMPLETE - 1), homeScore: 5, awayScore: 2 },
        ],
        FACTOR_PICK_COMPLETE,
      );
      expect(result).toEqual({ wins: 0, losses: 0, total: 0 });
    });

    it('homeScore/awayScore null (미종료) → 제외', () => {
      const result = computeConvergenceRecordFromScores(
        [{ convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: null, awayScore: null }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result).toEqual({ wins: 0, losses: 0, total: 0 });
    });

    it('빈 배열 → { wins: 0, losses: 0, total: 0 }', () => {
      expect(computeConvergenceRecordFromScores([], FACTOR_PICK_COMPLETE)).toEqual({
        wins: 0,
        losses: 0,
        total: 0,
      });
    });
  });

  describe('집계 포함 — 경계값', () => {
    it('|convergenceNetScore| = threshold, 홈 수렴 + 홈 승 → win', () => {
      const result = computeConvergenceRecordFromScores(
        [{ convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 5, awayScore: 2 }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result).toEqual({ wins: 1, losses: 0, total: 1 });
    });

    it('음수 threshold 충족(어웨이 수렴) + 어웨이 승 → win', () => {
      const result = computeConvergenceRecordFromScores(
        [{ convergenceNetScore: -FACTOR_PICK_COMPLETE, homeScore: 2, awayScore: 5 }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result).toEqual({ wins: 1, losses: 0, total: 1 });
    });
  });

  describe('wins / losses 집계 — 실제 스코어 기준 재산출', () => {
    it('홈 수렴 + 홈 승 → wins+1, total+1', () => {
      const result = computeConvergenceRecordFromScores(
        [{ convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 5, awayScore: 2 }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result.wins).toBe(1);
      expect(result.losses).toBe(0);
      expect(result.total).toBe(1);
    });

    it('홈 수렴 + 어웨이 승 → losses+1, total+1', () => {
      const result = computeConvergenceRecordFromScores(
        [{ convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 2, awayScore: 5 }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result.wins).toBe(0);
      expect(result.losses).toBe(1);
      expect(result.total).toBe(1);
    });

    it('회귀 방지: 모델 예측(isCorrect)과 수렴 픽이 엇갈려도 실제 스코어로만 판정 (cycle 2299 버그 재현 케이스)', () => {
      // 모델은 어웨이팀을 예측해 맞혔더라도(isCorrect=true였을 상황), 수렴 픽은 홈팀 우세였고 홈팀이 짐 → loss여야 함
      const result = computeConvergenceRecordFromScores(
        [{ convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 2, awayScore: 5 }],
        FACTOR_PICK_COMPLETE,
      );
      expect(result).toEqual({ wins: 0, losses: 1, total: 1 });
    });
  });

  describe('복합 시나리오', () => {
    it('2승 1패 + 제외 조건들 혼합', () => {
      const result = computeConvergenceRecordFromScores(
        [
          { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 5, awayScore: 2 },       // 포함, win (홈 수렴 + 홈 승)
          { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 2, awayScore: 5 },       // 포함, loss (홈 수렴 + 어웨이 승)
          { convergenceNetScore: -FACTOR_PICK_COMPLETE, homeScore: 2, awayScore: 5 },      // 포함, win (어웨이 수렴 + 어웨이 승)
          { convergenceNetScore: FACTOR_PICK_COMPLETE - 1, homeScore: 5, awayScore: 2 },   // 제외 (임계 미달)
          { convergenceNetScore: null, homeScore: 5, awayScore: 2 },                        // 제외 (null)
          { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: null, awayScore: null }, // 제외 (미종료)
        ],
        FACTOR_PICK_COMPLETE,
      );
      expect(result).toEqual({ wins: 2, losses: 1, total: 3 });
    });

    it('wins + losses = total 불변', () => {
      const result = computeConvergenceRecordFromScores(
        [
          { convergenceNetScore: FACTOR_PICK_COMPLETE + 2, homeScore: 5, awayScore: 2 },
          { convergenceNetScore: FACTOR_PICK_COMPLETE + 3, homeScore: 2, awayScore: 5 },
          { convergenceNetScore: -(FACTOR_PICK_COMPLETE + 1), homeScore: 2, awayScore: 5 },
        ],
        FACTOR_PICK_COMPLETE,
      );
      expect(result.wins + result.losses).toBe(result.total);
    });
  });
});
