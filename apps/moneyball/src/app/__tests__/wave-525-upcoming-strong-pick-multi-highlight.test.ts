/**
 * wave-525: 이번 주 남은 경기 수렴 픽 복수 강조
 * FACTOR_PICK_STRONG 이상 모든 경기를 Set으로 관리 — TOP픽(amber) + 기타 강수렴(brand) 3-tier 구분
 */

import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_STRONG, FACTOR_PICK_COMPLETE, FACTOR_PICK_MIN_FACTORS } from '@moneyball/shared';

interface MinGame {
  gameId: number;
  convergenceNetScore: number | null;
}

function pickStrongUpcoming(games: MinGame[]): Set<number> {
  return new Set(
    games
      .filter((g) => g.convergenceNetScore != null && Math.abs(g.convergenceNetScore) >= FACTOR_PICK_STRONG)
      .map((g) => g.gameId)
  );
}

function pickTopUpcoming(games: MinGame[]): number | null {
  return (
    games
      .filter((g) => g.convergenceNetScore != null && Math.abs(g.convergenceNetScore) >= FACTOR_PICK_STRONG)
      .sort((a, b) => Math.abs(b.convergenceNetScore!) - Math.abs(a.convergenceNetScore!))
      .at(0)?.gameId ?? null
  );
}

describe('wave-525 pickStrongUpcoming — Set 생성', () => {
  it('빈 배열이면 빈 Set', () => {
    expect(pickStrongUpcoming([])).toEqual(new Set());
  });

  it('threshold 미달 시 빈 Set', () => {
    const games: MinGame[] = [
      { gameId: 1, convergenceNetScore: 7 },
      { gameId: 2, convergenceNetScore: -6 },
      { gameId: 3, convergenceNetScore: null },
    ];
    expect(pickStrongUpcoming(games)).toEqual(new Set());
  });

  it('threshold 정확히 충족 시 포함', () => {
    const games: MinGame[] = [
      { gameId: 1, convergenceNetScore: FACTOR_PICK_STRONG },
      { gameId: 2, convergenceNetScore: 4 },
    ];
    const result = pickStrongUpcoming(games);
    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(false);
  });

  it('복수 후보 모두 포함', () => {
    const games: MinGame[] = [
      { gameId: 1, convergenceNetScore: FACTOR_PICK_STRONG },
      { gameId: 2, convergenceNetScore: FACTOR_PICK_COMPLETE },
      { gameId: 3, convergenceNetScore: -(FACTOR_PICK_STRONG + 1) },
      { gameId: 4, convergenceNetScore: 3 },
    ];
    const result = pickStrongUpcoming(games);
    expect(result.size).toBe(3);
    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(true);
    expect(result.has(3)).toBe(true);
    expect(result.has(4)).toBe(false);
  });

  it('음수 netScore (원정팀 우위) 도 포함', () => {
    const games: MinGame[] = [
      { gameId: 10, convergenceNetScore: -FACTOR_PICK_STRONG },
    ];
    expect(pickStrongUpcoming(games).has(10)).toBe(true);
  });

  it('null convergenceNetScore 경기는 제외', () => {
    const games: MinGame[] = [
      { gameId: 1, convergenceNetScore: null },
      { gameId: 2, convergenceNetScore: FACTOR_PICK_STRONG },
    ];
    const result = pickStrongUpcoming(games);
    expect(result.has(1)).toBe(false);
    expect(result.has(2)).toBe(true);
  });
});

describe('wave-525 strongUpcomingPickCount', () => {
  it('강수렴 픽 없으면 0', () => {
    const games: MinGame[] = [
      { gameId: 1, convergenceNetScore: 5 },
      { gameId: 2, convergenceNetScore: null },
    ];
    expect(pickStrongUpcoming(games).size).toBe(0);
  });

  it('강수렴 픽 3개', () => {
    const games: MinGame[] = [
      { gameId: 1, convergenceNetScore: FACTOR_PICK_STRONG },
      { gameId: 2, convergenceNetScore: FACTOR_PICK_STRONG + 1 },
      { gameId: 3, convergenceNetScore: -FACTOR_PICK_COMPLETE },
      { gameId: 4, convergenceNetScore: 2 },
    ];
    expect(pickStrongUpcoming(games).size).toBe(3);
  });
});

describe('wave-525 TOP픽 vs 강수렴 픽 구분', () => {
  it('TOP픽은 Set에 포함 — 단 isStrongUpcomingPick = !isTopUpcomingPick && inSet', () => {
    const games: MinGame[] = [
      { gameId: 1, convergenceNetScore: FACTOR_PICK_STRONG },
      { gameId: 2, convergenceNetScore: FACTOR_PICK_STRONG + 2 },
    ];
    const strongSet = pickStrongUpcoming(games);
    const topId = pickTopUpcoming(games);

    expect(topId).toBe(2);
    expect(strongSet.has(2)).toBe(true);
    expect(strongSet.has(1)).toBe(true);

    const isTopPick = (gameId: number) => topId !== null && gameId === topId;
    const isStrongPick = (gameId: number) => !isTopPick(gameId) && strongSet.has(gameId);

    expect(isTopPick(2)).toBe(true);
    expect(isStrongPick(2)).toBe(false); // TOP픽은 강수렴 픽에서 제외 (amber 우선)
    expect(isStrongPick(1)).toBe(true);  // 나머지는 brand 처리
  });

  it('단일 후보면 TOP픽만 존재, 강수렴 픽 = 0', () => {
    const games: MinGame[] = [
      { gameId: 5, convergenceNetScore: FACTOR_PICK_STRONG },
      { gameId: 6, convergenceNetScore: 3 },
    ];
    const strongSet = pickStrongUpcoming(games);
    const topId = pickTopUpcoming(games);

    const isStrongPick = (gameId: number) =>
      topId !== null
        ? gameId !== topId && strongSet.has(gameId)
        : strongSet.has(gameId);

    expect(isStrongPick(5)).toBe(false); // TOP픽이므로 강수렴 픽 X
    expect(isStrongPick(6)).toBe(false); // threshold 미달
  });
});

describe('wave-525 threshold 상수 검증', () => {
  it('FACTOR_PICK_STRONG = 8', () => {
    expect(FACTOR_PICK_STRONG).toBe(8);
  });

  it('FACTOR_PICK_COMPLETE > FACTOR_PICK_STRONG', () => {
    expect(FACTOR_PICK_COMPLETE).toBeGreaterThan(FACTOR_PICK_STRONG);
  });

  it('FACTOR_PICK_STRONG >= FACTOR_PICK_MIN_FACTORS', () => {
    expect(FACTOR_PICK_STRONG).toBeGreaterThanOrEqual(FACTOR_PICK_MIN_FACTORS);
  });
});
