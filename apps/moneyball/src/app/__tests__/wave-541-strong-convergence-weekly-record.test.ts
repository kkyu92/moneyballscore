import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_MIN_FACTORS, FACTOR_PICK_STRONG } from '@moneyball/shared';

// wave-541: 이번 주 강수렴 픽 성적 — |convergenceNetScore| ≥ FACTOR_PICK_STRONG 종료 경기 승/패 집계
// analysis/page.tsx — weeklyStrongConvergenceRecord 집계 로직
//
// 조건:
//   1. convergenceNetScore !== null && |convergenceNetScore| >= FACTOR_PICK_STRONG (8, ≠ wave-405 의 7)
//   2. homeScore !== null && awayScore !== null (경기 종료)
//   3. favoredHome = convergenceNetScore > 0
//   4. favWon = favoredHome ? homeScore > awayScore : awayScore > homeScore
//
// 결과: { wins: number, losses: number }
// 표시: wins + losses > 0 시 "이번 주 N승 M패" (이번 주 남은 경기 섹션 헤더)

interface GameCard {
  convergenceNetScore: number | null;
  homeScore: number | null;
  awayScore: number | null;
}

function computeStrongWeeklyRecord(games: GameCard[]): { wins: number; losses: number } {
  return games.reduce(
    (acc, g) => {
      if (g.convergenceNetScore === null || Math.abs(g.convergenceNetScore) < FACTOR_PICK_STRONG) return acc;
      if (g.homeScore === null || g.awayScore === null) return acc;
      const favoredHome = g.convergenceNetScore > 0;
      const favWon = favoredHome ? g.homeScore > g.awayScore : g.awayScore > g.homeScore;
      return { wins: acc.wins + (favWon ? 1 : 0), losses: acc.losses + (favWon ? 0 : 1) };
    },
    { wins: 0, losses: 0 },
  );
}

describe('wave-541: 강수렴 픽 이번 주 성적 (FACTOR_PICK_STRONG 임계)', () => {
  it('강수렴 경기 없음 — 0승 0패', () => {
    const games: GameCard[] = [
      { convergenceNetScore: FACTOR_PICK_MIN_FACTORS, homeScore: 5, awayScore: 2 }, // 7 = STRONG 미만
      { convergenceNetScore: null, homeScore: 3, awayScore: 1 },
    ];
    expect(computeStrongWeeklyRecord(games)).toEqual({ wins: 0, losses: 0 });
  });

  it('FACTOR_PICK_MIN_FACTORS(7) = FACTOR_PICK_STRONG 미만 — 제외 (wave-405 와 임계 차이)', () => {
    const games: GameCard[] = [
      { convergenceNetScore: FACTOR_PICK_MIN_FACTORS, homeScore: 5, awayScore: 1 },
      { convergenceNetScore: -FACTOR_PICK_MIN_FACTORS, homeScore: 1, awayScore: 4 },
    ];
    expect(computeStrongWeeklyRecord(games)).toEqual({ wins: 0, losses: 0 });
  });

  it('수렴도 정확히 FACTOR_PICK_STRONG(8) — 포함', () => {
    const games: GameCard[] = [
      { convergenceNetScore: FACTOR_PICK_STRONG, homeScore: 3, awayScore: 1 },
    ];
    expect(computeStrongWeeklyRecord(games)).toEqual({ wins: 1, losses: 0 });
  });

  it('강수렴 경기(홈 유리) — 홈 이김 → 1승', () => {
    const games: GameCard[] = [
      { convergenceNetScore: 9, homeScore: 5, awayScore: 2 },
    ];
    expect(computeStrongWeeklyRecord(games)).toEqual({ wins: 1, losses: 0 });
  });

  it('강수렴 경기(홈 유리) — 홈 짐 → 1패', () => {
    const games: GameCard[] = [
      { convergenceNetScore: 9, homeScore: 1, awayScore: 4 },
    ];
    expect(computeStrongWeeklyRecord(games)).toEqual({ wins: 0, losses: 1 });
  });

  it('강수렴 경기(원정 유리) — 원정 이김 → 1승', () => {
    const games: GameCard[] = [
      { convergenceNetScore: -8, homeScore: 1, awayScore: 3 },
    ];
    expect(computeStrongWeeklyRecord(games)).toEqual({ wins: 1, losses: 0 });
  });

  it('강수렴 경기(원정 유리) — 원정 짐 → 1패', () => {
    const games: GameCard[] = [
      { convergenceNetScore: -8, homeScore: 4, awayScore: 2 },
    ];
    expect(computeStrongWeeklyRecord(games)).toEqual({ wins: 0, losses: 1 });
  });

  it('경기 미종료(score null) — 집계 제외', () => {
    const games: GameCard[] = [
      { convergenceNetScore: 9, homeScore: null, awayScore: null },
    ];
    expect(computeStrongWeeklyRecord(games)).toEqual({ wins: 0, losses: 0 });
  });

  it('복합 케이스 — 강수렴(≥8) 3승 1패, FACTOR_PICK_MIN_FACTORS(7) 제외', () => {
    const games: GameCard[] = [
      { convergenceNetScore: 9, homeScore: 5, awayScore: 2 },   // 홈 유리 → 홈 이김 → 승
      { convergenceNetScore: -8, homeScore: 1, awayScore: 3 },  // 원정 유리 → 원정 이김 → 승
      { convergenceNetScore: 10, homeScore: 0, awayScore: 3 },  // 홈 유리 → 홈 짐 → 패
      { convergenceNetScore: 8, homeScore: 6, awayScore: 2 },   // 홈 유리 → 홈 이김 → 승
      { convergenceNetScore: 7, homeScore: 5, awayScore: 1 },   // STRONG 미만 → 제외
      { convergenceNetScore: null, homeScore: 2, awayScore: 2 }, // null → 제외
    ];
    expect(computeStrongWeeklyRecord(games)).toEqual({ wins: 3, losses: 1 });
  });

  it('음수 경계 — -FACTOR_PICK_STRONG 포함', () => {
    const games: GameCard[] = [
      { convergenceNetScore: -FACTOR_PICK_STRONG, homeScore: 1, awayScore: 4 },
    ];
    expect(computeStrongWeeklyRecord(games)).toEqual({ wins: 1, losses: 0 });
  });
});
