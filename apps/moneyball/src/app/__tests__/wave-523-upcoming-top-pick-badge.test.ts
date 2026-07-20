/**
 * wave-523: 이번 주 남은 경기 수렴 TOP 픽 배지
 * |convergenceNetScore| >= FACTOR_PICK_STRONG 인 경기 중 최대값 경기를 TOP픽으로 하이라이트
 */

import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_STRONG, FACTOR_PICK_COMPLETE, FACTOR_PICK_MIN_FACTORS } from '@moneyball/shared';

interface MinGame {
  gameId: number;
  convergenceNetScore: number | null;
}

function pickTopUpcoming(games: MinGame[]): number | null {
  return (
    games
      .filter((g) => g.convergenceNetScore != null && Math.abs(g.convergenceNetScore) >= FACTOR_PICK_STRONG)
      .sort((a, b) => Math.abs(b.convergenceNetScore!) - Math.abs(a.convergenceNetScore!))
      .at(0)?.gameId ?? null
  );
}

describe('wave-523 topUpcomingPickGameId 선택 로직', () => {
  it('빈 배열이면 null', () => {
    expect(pickTopUpcoming([])).toBeNull();
  });

  it('threshold 미달 시 null — convergenceNetScore < FACTOR_PICK_STRONG', () => {
    const games: MinGame[] = [
      { gameId: 1, convergenceNetScore: 7 },
      { gameId: 2, convergenceNetScore: -6 },
    ];
    expect(pickTopUpcoming(games)).toBeNull();
  });

  it('threshold 충족 시 해당 gameId 반환', () => {
    const games: MinGame[] = [
      { gameId: 1, convergenceNetScore: FACTOR_PICK_STRONG },
      { gameId: 2, convergenceNetScore: 4 },
    ];
    expect(pickTopUpcoming(games)).toBe(1);
  });

  it('여러 후보 중 |convergenceNetScore| 최대 선택', () => {
    const games: MinGame[] = [
      { gameId: 1, convergenceNetScore: FACTOR_PICK_STRONG },
      { gameId: 2, convergenceNetScore: FACTOR_PICK_COMPLETE },
      { gameId: 3, convergenceNetScore: -(FACTOR_PICK_STRONG + 1) },
    ];
    expect(pickTopUpcoming(games)).toBe(2);
  });

  it('음수 netScore (원정팀 우위) 도 threshold 충족 시 반환', () => {
    const games: MinGame[] = [
      { gameId: 10, convergenceNetScore: -FACTOR_PICK_STRONG },
    ];
    expect(pickTopUpcoming(games)).toBe(10);
  });

  it('null convergenceNetScore 경기는 제외', () => {
    const games: MinGame[] = [
      { gameId: 1, convergenceNetScore: null },
      { gameId: 2, convergenceNetScore: FACTOR_PICK_STRONG },
    ];
    expect(pickTopUpcoming(games)).toBe(2);
  });

  it('전체 null 이면 null', () => {
    const games: MinGame[] = [
      { gameId: 1, convergenceNetScore: null },
      { gameId: 2, convergenceNetScore: null },
    ];
    expect(pickTopUpcoming(games)).toBeNull();
  });
});

describe('wave-523 isTopUpcomingPick 판별', () => {
  it('topUpcomingPickGameId 와 gameId 일치 시 true', () => {
    const topUpcomingPickGameId: number | null = 42;
    const gameId: number = 42;
    expect(topUpcomingPickGameId !== null && gameId === topUpcomingPickGameId).toBe(true);
  });

  it('불일치 시 false', () => {
    const topUpcomingPickGameId: number | null = 42;
    const gameId: number = 99;
    expect(topUpcomingPickGameId !== null && gameId === topUpcomingPickGameId).toBe(false);
  });

  it('topUpcomingPickGameId null 이면 항상 false', () => {
    const topUpcomingPickGameId = null;
    const gameId = 42;
    expect(topUpcomingPickGameId !== null && gameId === topUpcomingPickGameId).toBe(false);
  });
});

describe('wave-523 threshold 상수 검증', () => {
  it('FACTOR_PICK_STRONG >= FACTOR_PICK_MIN_FACTORS', () => {
    expect(FACTOR_PICK_STRONG).toBeGreaterThanOrEqual(FACTOR_PICK_MIN_FACTORS);
  });

  it('FACTOR_PICK_COMPLETE > FACTOR_PICK_STRONG', () => {
    expect(FACTOR_PICK_COMPLETE).toBeGreaterThan(FACTOR_PICK_STRONG);
  });

  it('FACTOR_PICK_STRONG = 8', () => {
    expect(FACTOR_PICK_STRONG).toBe(8);
  });
});
