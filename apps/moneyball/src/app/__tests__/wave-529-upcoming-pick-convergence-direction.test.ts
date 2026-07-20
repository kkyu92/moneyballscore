/**
 * wave-529: 이번 주 남은 경기 TOP픽/강수렴 픽 수렴 방향 팀명 표시
 * convergenceNetScore 부호 → 홈(양수) / 원정(음수) 방향 파생
 * isTopUpcomingPick || isStrongUpcomingPick 카드에만 표시
 */

import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_STRONG } from '@moneyball/shared';

interface PickGameMinimal {
  gameId: number;
  homeCode: string;
  awayCode: string;
  convergenceNetScore: number | null;
}

function getConvergenceFavoredCode(g: PickGameMinimal): string | null {
  if (g.convergenceNetScore == null) return null;
  return g.convergenceNetScore > 0 ? g.homeCode : g.awayCode;
}

function isPickCard(
  gameId: number,
  topPickId: number | null,
  strongPickIds: Set<number>,
): boolean {
  const isTop = topPickId !== null && gameId === topPickId;
  const isStrong = !isTop && strongPickIds.has(gameId);
  return isTop || isStrong;
}

describe('wave-529 getConvergenceFavoredCode', () => {
  it('양수 netScore → 홈팀', () => {
    const g: PickGameMinimal = {
      gameId: 1,
      homeCode: 'LT',
      awayCode: 'OB',
      convergenceNetScore: 8,
    };
    expect(getConvergenceFavoredCode(g)).toBe('LT');
  });

  it('음수 netScore → 원정팀', () => {
    const g: PickGameMinimal = {
      gameId: 2,
      homeCode: 'HH',
      awayCode: 'NC',
      convergenceNetScore: -9,
    };
    expect(getConvergenceFavoredCode(g)).toBe('NC');
  });

  it('null netScore → null (방향 미표시)', () => {
    const g: PickGameMinimal = {
      gameId: 3,
      homeCode: 'SS',
      awayCode: 'KT',
      convergenceNetScore: null,
    };
    expect(getConvergenceFavoredCode(g)).toBeNull();
  });
});

describe('wave-529 TOP픽 카드 수렴 방향 표시 조건', () => {
  const topPick: PickGameMinimal = {
    gameId: 10,
    homeCode: 'LG',
    awayCode: 'SK',
    convergenceNetScore: FACTOR_PICK_STRONG + 2, // 10
  };
  const strongPick: PickGameMinimal = {
    gameId: 11,
    homeCode: 'KIA',
    awayCode: 'LT',
    convergenceNetScore: -(FACTOR_PICK_STRONG + 1), // -9 → 원정(LT) 우위
  };
  const normalGame: PickGameMinimal = {
    gameId: 12,
    homeCode: 'HH',
    awayCode: 'OB',
    convergenceNetScore: 5, // threshold 미달
  };

  const topPickId = 10;
  const strongPickIds = new Set([10, 11]);

  it('TOP픽 카드 — convergenceFavoredCode 홈팀', () => {
    expect(isPickCard(topPick.gameId, topPickId, strongPickIds)).toBe(true);
    expect(getConvergenceFavoredCode(topPick)).toBe('LG');
  });

  it('강수렴 픽 카드 — convergenceFavoredCode 원정팀', () => {
    expect(isPickCard(strongPick.gameId, topPickId, strongPickIds)).toBe(true);
    expect(getConvergenceFavoredCode(strongPick)).toBe('LT');
  });

  it('일반 경기 카드 — isPickCard false → 방향 미표시', () => {
    expect(isPickCard(normalGame.gameId, topPickId, strongPickIds)).toBe(false);
  });
});

describe('wave-529 수렴 방향 표시 — null 안전성', () => {
  it('convergenceNetScore = null 이고 isPickCard = true → 미표시 (null guard)', () => {
    const g: PickGameMinimal = {
      gameId: 20,
      homeCode: 'SS',
      awayCode: 'NC',
      convergenceNetScore: null,
    };
    const topPickId = 20;
    const strongPickIds = new Set([20]);
    expect(isPickCard(g.gameId, topPickId, strongPickIds)).toBe(true);
    expect(getConvergenceFavoredCode(g)).toBeNull();
  });

  it('convergenceNetScore = 0 → awayCode (> 0 조건, 0은 away로 fallback)', () => {
    const g: PickGameMinimal = {
      gameId: 21,
      homeCode: 'KT',
      awayCode: 'LG',
      convergenceNetScore: 0,
    };
    expect(getConvergenceFavoredCode(g)).toBe('LG');
  });
});

describe('wave-529 threshold 상수 검증', () => {
  it('FACTOR_PICK_STRONG = 8', () => {
    expect(FACTOR_PICK_STRONG).toBe(8);
  });
});
