/**
 * wave-531: 이번 주 남은 경기 팀별 수렴 우위 현황
 * |convergenceNetScore| >= FACTOR_PICK_MIN_FACTORS 인 경기의 우세 팀 집계 →
 * 수렴 픽 우위 경기 수 내림차순 정렬 → 상위 UPCOMING_CONVERGENCE_TEAM_LIMIT(5)팀 표시.
 */

import { describe, it, expect } from 'vitest';
import { UPCOMING_CONVERGENCE_TEAM_LIMIT, FACTOR_PICK_MIN_FACTORS } from '@moneyball/shared';

interface RemainingGame {
  homeCode: string;
  awayCode: string;
  convergenceNetScore: number | null;
}

function computeUpcomingConvergenceTeams(
  games: RemainingGame[],
): Array<[string, number]> {
  const map = new Map<string, number>();
  for (const g of games) {
    if (g.convergenceNetScore == null || Math.abs(g.convergenceNetScore) < FACTOR_PICK_MIN_FACTORS) continue;
    const favoredCode = g.convergenceNetScore > 0 ? g.homeCode : g.awayCode;
    map.set(favoredCode, (map.get(favoredCode) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, UPCOMING_CONVERGENCE_TEAM_LIMIT);
}

describe('wave-531 팀별 수렴 우위 집계 — computeUpcomingConvergenceTeams', () => {
  it('빈 경기 목록 → 빈 배열', () => {
    expect(computeUpcomingConvergenceTeams([])).toHaveLength(0);
  });

  it('임계 미달 경기만 → 빈 배열 (|netScore| < FACTOR_PICK_MIN_FACTORS)', () => {
    const games: RemainingGame[] = [
      { homeCode: 'LT', awayCode: 'OB', convergenceNetScore: FACTOR_PICK_MIN_FACTORS - 1 },
      { homeCode: 'LG', awayCode: 'HH', convergenceNetScore: -(FACTOR_PICK_MIN_FACTORS - 1) },
    ];
    expect(computeUpcomingConvergenceTeams(games)).toHaveLength(0);
  });

  it('null convergenceNetScore → 집계 제외', () => {
    const games: RemainingGame[] = [
      { homeCode: 'SS', awayCode: 'NC', convergenceNetScore: null },
    ];
    expect(computeUpcomingConvergenceTeams(games)).toHaveLength(0);
  });

  it('양수 netScore → 홈팀 집계', () => {
    const games: RemainingGame[] = [
      { homeCode: 'LT', awayCode: 'OB', convergenceNetScore: FACTOR_PICK_MIN_FACTORS },
    ];
    const result = computeUpcomingConvergenceTeams(games);
    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe('LT');
    expect(result[0][1]).toBe(1);
  });

  it('음수 netScore → 원정팀 집계', () => {
    const games: RemainingGame[] = [
      { homeCode: 'KIA', awayCode: 'NC', convergenceNetScore: -FACTOR_PICK_MIN_FACTORS },
    ];
    const result = computeUpcomingConvergenceTeams(games);
    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe('NC');
    expect(result[0][1]).toBe(1);
  });

  it('같은 팀 복수 경기 → count 누적', () => {
    const games: RemainingGame[] = [
      { homeCode: 'LT', awayCode: 'OB', convergenceNetScore: 8 },
      { homeCode: 'LT', awayCode: 'SS', convergenceNetScore: 9 },
      { homeCode: 'LG', awayCode: 'LT', convergenceNetScore: -10 }, // LT = 원정, 우위
    ];
    const result = computeUpcomingConvergenceTeams(games);
    const ltEntry = result.find(([code]) => code === 'LT');
    expect(ltEntry).toBeDefined();
    expect(ltEntry![1]).toBe(3);
  });

  it('내림차순 정렬 — 우위 경기 수 많은 팀이 앞에', () => {
    const games: RemainingGame[] = [
      { homeCode: 'LG', awayCode: 'OB', convergenceNetScore: 8 },
      { homeCode: 'LT', awayCode: 'HH', convergenceNetScore: 9 },
      { homeCode: 'LT', awayCode: 'KIA', convergenceNetScore: 10 }, // LT = 2회
    ];
    const result = computeUpcomingConvergenceTeams(games);
    expect(result[0][0]).toBe('LT');
    expect(result[0][1]).toBe(2);
  });

  it('UPCOMING_CONVERGENCE_TEAM_LIMIT(5) 초과 시 상위 5팀만 반환', () => {
    const teams = ['LT', 'LG', 'SS', 'NC', 'OB', 'KIA', 'KT'];
    const games: RemainingGame[] = teams.map((homeCode, i) => ({
      homeCode,
      awayCode: 'HH',
      convergenceNetScore: FACTOR_PICK_MIN_FACTORS + i,
    }));
    const result = computeUpcomingConvergenceTeams(games);
    expect(result).toHaveLength(UPCOMING_CONVERGENCE_TEAM_LIMIT);
  });
});

describe('wave-531 상수 검증', () => {
  it('UPCOMING_CONVERGENCE_TEAM_LIMIT = 5 (silent drift guard)', () => {
    expect(UPCOMING_CONVERGENCE_TEAM_LIMIT).toBe(5);
  });

  it('FACTOR_PICK_MIN_FACTORS = 7 (wave-531 gate 기준)', () => {
    expect(FACTOR_PICK_MIN_FACTORS).toBe(7);
  });
});
