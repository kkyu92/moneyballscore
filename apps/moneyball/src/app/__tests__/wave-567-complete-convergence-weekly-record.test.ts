import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_COMPLETE } from '@moneyball/shared';
import { computeWeeklyConvergenceRecord } from '@/lib/analysis/convergenceRecord';

// wave-567: 완전수렴 픽 이번 주 성적 guard
// wave-568: computeWeeklyConvergenceRecord 순수 함수 추출 후 실제 구현 import
//
// 불변:
//   - |convergenceNetScore| < threshold → 집계 제외
//   - homeScore/awayScore null → 집계 제외 (미종료 경기)
//   - convergenceNetScore > 0 → 홈 팀 우세 픽
//   - 우세 팀 승리 → wins+1, 패배 → losses+1

describe('wave-567: 완전수렴 픽 이번 주 성적 guard', () => {
  describe('FACTOR_PICK_COMPLETE 상수 정합', () => {
    it('FACTOR_PICK_COMPLETE = 10', () => {
      expect(FACTOR_PICK_COMPLETE).toBe(10);
    });
  });

  describe('집계 제외 조건', () => {
    it('convergenceNetScore null → 제외', () => {
      const result = computeWeeklyConvergenceRecord([
        { convergenceNetScore: null, homeScore: 5, awayScore: 3 },
      ], FACTOR_PICK_COMPLETE);
      expect(result).toEqual({ wins: 0, losses: 0 });
    });

    it('|convergenceNetScore| < FACTOR_PICK_COMPLETE → 제외', () => {
      const result = computeWeeklyConvergenceRecord([
        { convergenceNetScore: FACTOR_PICK_COMPLETE - 1, homeScore: 5, awayScore: 3 },
        { convergenceNetScore: -(FACTOR_PICK_COMPLETE - 1), homeScore: 5, awayScore: 3 },
      ], FACTOR_PICK_COMPLETE);
      expect(result).toEqual({ wins: 0, losses: 0 });
    });

    it('homeScore null → 제외 (미종료)', () => {
      const result = computeWeeklyConvergenceRecord([
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: null, awayScore: null },
      ], FACTOR_PICK_COMPLETE);
      expect(result).toEqual({ wins: 0, losses: 0 });
    });
  });

  describe('집계 포함 — FACTOR_PICK_COMPLETE 경계', () => {
    it('|convergenceNetScore| = FACTOR_PICK_COMPLETE → 집계 포함', () => {
      const result = computeWeeklyConvergenceRecord([
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 5, awayScore: 3 }, // 홈 우세, 홈 승 → win
      ], FACTOR_PICK_COMPLETE);
      expect(result).toEqual({ wins: 1, losses: 0 });
    });

    it('홈 팀 우세(+score), 홈 팀 승리 → wins+1', () => {
      const result = computeWeeklyConvergenceRecord([
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 6, awayScore: 2 },
      ], FACTOR_PICK_COMPLETE);
      expect(result.wins).toBe(1);
      expect(result.losses).toBe(0);
    });

    it('홈 팀 우세(+score), 어웨이 팀 승리 → losses+1', () => {
      const result = computeWeeklyConvergenceRecord([
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 2, awayScore: 5 },
      ], FACTOR_PICK_COMPLETE);
      expect(result.wins).toBe(0);
      expect(result.losses).toBe(1);
    });

    it('어웨이 팀 우세(-score), 어웨이 팀 승리 → wins+1', () => {
      const result = computeWeeklyConvergenceRecord([
        { convergenceNetScore: -FACTOR_PICK_COMPLETE, homeScore: 2, awayScore: 7 },
      ], FACTOR_PICK_COMPLETE);
      expect(result.wins).toBe(1);
      expect(result.losses).toBe(0);
    });

    it('어웨이 팀 우세(-score), 홈 팀 승리 → losses+1', () => {
      const result = computeWeeklyConvergenceRecord([
        { convergenceNetScore: -FACTOR_PICK_COMPLETE, homeScore: 4, awayScore: 1 },
      ], FACTOR_PICK_COMPLETE);
      expect(result.wins).toBe(0);
      expect(result.losses).toBe(1);
    });
  });

  describe('복합 시나리오', () => {
    it('완전수렴 2승 1패 + 미해당 경기 제외', () => {
      const result = computeWeeklyConvergenceRecord([
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 5, awayScore: 3 },     // win
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 2, awayScore: 4 },     // loss
        { convergenceNetScore: -FACTOR_PICK_COMPLETE, homeScore: 1, awayScore: 6 },    // win (away 우세)
        { convergenceNetScore: FACTOR_PICK_COMPLETE - 1, homeScore: 5, awayScore: 0 }, // 제외 (임계 미달)
        { convergenceNetScore: null, homeScore: 5, awayScore: 3 },                     // 제외 (null)
      ], FACTOR_PICK_COMPLETE);
      expect(result).toEqual({ wins: 2, losses: 1 });
    });

    it('완전수렴 경기 0건 → { wins: 0, losses: 0 }', () => {
      const result = computeWeeklyConvergenceRecord([
        { convergenceNetScore: 7, homeScore: 3, awayScore: 2 }, // FACTOR_PICK_STRONG이지만 COMPLETE 미달
        { convergenceNetScore: null, homeScore: 3, awayScore: 1 },
      ], FACTOR_PICK_COMPLETE);
      expect(result).toEqual({ wins: 0, losses: 0 });
    });
  });
});
