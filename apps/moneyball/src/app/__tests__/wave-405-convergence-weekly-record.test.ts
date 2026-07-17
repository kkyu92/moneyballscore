import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_MIN_FACTORS } from '@moneyball/shared';

// wave-405: 팩터 수렴 픽 이번 주 성적 라인
// analysis/page.tsx — weeklyConvergenceRecord 집계 로직
//
// 조건:
//   1. convergenceNetScore !== null && |convergenceNetScore| >= FACTOR_PICK_MIN_FACTORS
//   2. homeScore !== null && awayScore !== null (경기 종료)
//   3. favoredHome = convergenceNetScore > 0
//   4. favWon = favoredHome ? homeScore > awayScore : awayScore > homeScore
//
// 결과: { wins: number, losses: number }
// 표시: wins + losses > 0 시 "이번 주 N승 M패"

interface GameCard {
  convergenceNetScore: number | null;
  homeScore: number | null;
  awayScore: number | null;
}

function computeWeeklyRecord(games: GameCard[]): { wins: number; losses: number } {
  return games.reduce(
    (acc, g) => {
      if (g.convergenceNetScore === null || Math.abs(g.convergenceNetScore) < FACTOR_PICK_MIN_FACTORS) return acc;
      if (g.homeScore === null || g.awayScore === null) return acc;
      const favoredHome = g.convergenceNetScore > 0;
      const favWon = favoredHome ? g.homeScore > g.awayScore : g.awayScore > g.homeScore;
      return { wins: acc.wins + (favWon ? 1 : 0), losses: acc.losses + (favWon ? 0 : 1) };
    },
    { wins: 0, losses: 0 },
  );
}

describe('wave-405: 팩터 수렴 픽 이번 주 성적', () => {
  it('수렴 경기 없음 — 0승 0패', () => {
    const games: GameCard[] = [
      { convergenceNetScore: 3, homeScore: 5, awayScore: 2 },
      { convergenceNetScore: null, homeScore: 3, awayScore: 1 },
    ];
    expect(computeWeeklyRecord(games)).toEqual({ wins: 0, losses: 0 });
  });

  it('수렴 경기(홈 유리) — 홈 이김 → 1승', () => {
    const games: GameCard[] = [
      { convergenceNetScore: 8, homeScore: 5, awayScore: 2 },
    ];
    expect(computeWeeklyRecord(games)).toEqual({ wins: 1, losses: 0 });
  });

  it('수렴 경기(홈 유리) — 홈 짐 → 1패', () => {
    const games: GameCard[] = [
      { convergenceNetScore: 8, homeScore: 1, awayScore: 4 },
    ];
    expect(computeWeeklyRecord(games)).toEqual({ wins: 0, losses: 1 });
  });

  it('수렴 경기(원정 유리) — 원정 이김 → 1승', () => {
    const games: GameCard[] = [
      { convergenceNetScore: -7, homeScore: 1, awayScore: 3 },
    ];
    expect(computeWeeklyRecord(games)).toEqual({ wins: 1, losses: 0 });
  });

  it('수렴 경기(원정 유리) — 원정 짐 → 1패', () => {
    const games: GameCard[] = [
      { convergenceNetScore: -7, homeScore: 4, awayScore: 2 },
    ];
    expect(computeWeeklyRecord(games)).toEqual({ wins: 0, losses: 1 });
  });

  it('경기 미종료(score null) — 집계 제외', () => {
    const games: GameCard[] = [
      { convergenceNetScore: 8, homeScore: null, awayScore: null },
    ];
    expect(computeWeeklyRecord(games)).toEqual({ wins: 0, losses: 0 });
  });

  it('FACTOR_PICK_MIN_FACTORS 미만 수렴도 — 집계 제외', () => {
    const games: GameCard[] = [
      { convergenceNetScore: FACTOR_PICK_MIN_FACTORS - 1, homeScore: 5, awayScore: 1 },
    ];
    expect(computeWeeklyRecord(games)).toEqual({ wins: 0, losses: 0 });
  });

  it('복합 케이스 — 3승 1패', () => {
    const games: GameCard[] = [
      { convergenceNetScore: 8, homeScore: 5, awayScore: 2 },  // 홈 유리 → 홈 이김 → 승
      { convergenceNetScore: -7, homeScore: 1, awayScore: 3 }, // 원정 유리 → 원정 이김 → 승
      { convergenceNetScore: 9, homeScore: 0, awayScore: 3 },  // 홈 유리 → 홈 짐 → 패
      { convergenceNetScore: 10, homeScore: 6, awayScore: 2 }, // 홈 유리 → 홈 이김 → 승
      { convergenceNetScore: 3, homeScore: 5, awayScore: 1 },  // 수렴도 미달 → 제외
      { convergenceNetScore: null, homeScore: 2, awayScore: 2 }, // null → 제외
    ];
    expect(computeWeeklyRecord(games)).toEqual({ wins: 3, losses: 1 });
  });

  it('수렴도 정확히 FACTOR_PICK_MIN_FACTORS — 포함', () => {
    const games: GameCard[] = [
      { convergenceNetScore: FACTOR_PICK_MIN_FACTORS, homeScore: 3, awayScore: 1 },
    ];
    expect(computeWeeklyRecord(games)).toEqual({ wins: 1, losses: 0 });
  });

  it('음수 경계 — -FACTOR_PICK_MIN_FACTORS 포함', () => {
    const games: GameCard[] = [
      { convergenceNetScore: -FACTOR_PICK_MIN_FACTORS, homeScore: 1, awayScore: 4 },
    ];
    expect(computeWeeklyRecord(games)).toEqual({ wins: 1, losses: 0 });
  });
});
