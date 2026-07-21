import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_COMPLETE } from '@moneyball/shared';

// wave-567: 완전수렴 픽 이번 주 성적 guard
// analysis/page.tsx: weeklyCompleteConvergenceRecord reduce 로직 — 강수렴 wave-541 패턴 동기
//
// 불변:
//   - |convergenceNetScore| < FACTOR_PICK_COMPLETE → 집계 제외
//   - homeScore/awayScore null → 집계 제외 (미종료 경기)
//   - convergenceNetScore > 0 → 홈 팀 우세 픽
//   - 우세 팀 승리 → wins+1, 패배 → losses+1

type WeeklyGame = {
  convergenceNetScore: number | null;
  homeScore: number | null;
  awayScore: number | null;
};

function computeWeeklyCompleteRecord(games: WeeklyGame[]): { wins: number; losses: number } {
  return games.reduce(
    (acc, g) => {
      if (g.convergenceNetScore === null || Math.abs(g.convergenceNetScore) < FACTOR_PICK_COMPLETE) return acc;
      if (g.homeScore === null || g.awayScore === null) return acc;
      const favoredHome = g.convergenceNetScore > 0;
      const favWon = favoredHome ? g.homeScore > g.awayScore : g.awayScore > g.homeScore;
      return { wins: acc.wins + (favWon ? 1 : 0), losses: acc.losses + (favWon ? 0 : 1) };
    },
    { wins: 0, losses: 0 },
  );
}

describe('wave-567: 완전수렴 픽 이번 주 성적 guard', () => {
  describe('FACTOR_PICK_COMPLETE 상수 정합', () => {
    it('FACTOR_PICK_COMPLETE = 10', () => {
      expect(FACTOR_PICK_COMPLETE).toBe(10);
    });
  });

  describe('집계 제외 조건', () => {
    it('convergenceNetScore null → 제외', () => {
      const result = computeWeeklyCompleteRecord([
        { convergenceNetScore: null, homeScore: 5, awayScore: 3 },
      ]);
      expect(result).toEqual({ wins: 0, losses: 0 });
    });

    it('|convergenceNetScore| < FACTOR_PICK_COMPLETE → 제외', () => {
      const result = computeWeeklyCompleteRecord([
        { convergenceNetScore: FACTOR_PICK_COMPLETE - 1, homeScore: 5, awayScore: 3 },
        { convergenceNetScore: -(FACTOR_PICK_COMPLETE - 1), homeScore: 5, awayScore: 3 },
      ]);
      expect(result).toEqual({ wins: 0, losses: 0 });
    });

    it('homeScore null → 제외 (미종료)', () => {
      const result = computeWeeklyCompleteRecord([
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: null, awayScore: null },
      ]);
      expect(result).toEqual({ wins: 0, losses: 0 });
    });
  });

  describe('집계 포함 — FACTOR_PICK_COMPLETE 경계', () => {
    it('|convergenceNetScore| = FACTOR_PICK_COMPLETE → 집계 포함', () => {
      const result = computeWeeklyCompleteRecord([
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 5, awayScore: 3 }, // 홈 우세, 홈 승 → win
      ]);
      expect(result).toEqual({ wins: 1, losses: 0 });
    });

    it('홈 팀 우세(+score), 홈 팀 승리 → wins+1', () => {
      const result = computeWeeklyCompleteRecord([
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 6, awayScore: 2 },
      ]);
      expect(result.wins).toBe(1);
      expect(result.losses).toBe(0);
    });

    it('홈 팀 우세(+score), 어웨이 팀 승리 → losses+1', () => {
      const result = computeWeeklyCompleteRecord([
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 2, awayScore: 5 },
      ]);
      expect(result.wins).toBe(0);
      expect(result.losses).toBe(1);
    });

    it('어웨이 팀 우세(-score), 어웨이 팀 승리 → wins+1', () => {
      const result = computeWeeklyCompleteRecord([
        { convergenceNetScore: -FACTOR_PICK_COMPLETE, homeScore: 2, awayScore: 7 },
      ]);
      expect(result.wins).toBe(1);
      expect(result.losses).toBe(0);
    });

    it('어웨이 팀 우세(-score), 홈 팀 승리 → losses+1', () => {
      const result = computeWeeklyCompleteRecord([
        { convergenceNetScore: -FACTOR_PICK_COMPLETE, homeScore: 4, awayScore: 1 },
      ]);
      expect(result.wins).toBe(0);
      expect(result.losses).toBe(1);
    });
  });

  describe('복합 시나리오', () => {
    it('완전수렴 2승 1패 + 미해당 경기 제외', () => {
      const result = computeWeeklyCompleteRecord([
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 5, awayScore: 3 },     // win
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 2, awayScore: 4 },     // loss
        { convergenceNetScore: -FACTOR_PICK_COMPLETE, homeScore: 1, awayScore: 6 },    // win (away 우세)
        { convergenceNetScore: FACTOR_PICK_COMPLETE - 1, homeScore: 5, awayScore: 0 }, // 제외 (임계 미달)
        { convergenceNetScore: null, homeScore: 5, awayScore: 3 },                     // 제외 (null)
      ]);
      expect(result).toEqual({ wins: 2, losses: 1 });
    });

    it('완전수렴 경기 0건 → { wins: 0, losses: 0 }', () => {
      const result = computeWeeklyCompleteRecord([
        { convergenceNetScore: 7, homeScore: 3, awayScore: 2 }, // FACTOR_PICK_STRONG이지만 COMPLETE 미달
        { convergenceNetScore: null, homeScore: 3, awayScore: 1 },
      ]);
      expect(result).toEqual({ wins: 0, losses: 0 });
    });
  });
});
