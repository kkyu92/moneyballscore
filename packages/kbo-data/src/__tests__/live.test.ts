import { describe, it, expect } from 'vitest';
import { adjustWinProbability } from '../scrapers/kbo-live';

describe('이닝별 승리확률 보정', () => {
  const baseProb = 0.55; // pre_game 홈팀 55%

  it('경기 시작 전이면 원래 확률 반환', () => {
    expect(adjustWinProbability(baseProb, 0, 0, 0, true)).toBe(baseProb);
  });

  it('홈팀 리드 시 확률 상승', () => {
    const adjusted = adjustWinProbability(baseProb, 3, 1, 5, false);
    expect(adjusted).toBeGreaterThan(baseProb);
  });

  it('원정팀 리드 시 확률 하락', () => {
    const adjusted = adjustWinProbability(baseProb, 1, 4, 5, false);
    expect(adjusted).toBeLessThan(baseProb);
  });

  it('후반으로 갈수록 스코어 영향 커짐', () => {
    const early = adjustWinProbability(0.5, 2, 1, 2, false);
    const late = adjustWinProbability(0.5, 2, 1, 8, false);
    // 둘 다 홈 유리이지만, 후반이 더 강하게 반영
    expect(late).toBeGreaterThan(early);
  });

  it('9회말 홈팀 리드면 90%+', () => {
    const adjusted = adjustWinProbability(0.5, 5, 3, 9, false);
    expect(adjusted).toBeGreaterThanOrEqual(0.92);
  });

  it('동점이면 pre_game 확률에 가까움', () => {
    const adjusted = adjustWinProbability(baseProb, 3, 3, 5, true);
    // 동점이므로 스코어 보정 ~0, pre_game 가중치만 남음
    expect(Math.abs(adjusted - baseProb)).toBeLessThan(0.15);
  });

  it('확률이 0.02~0.98 범위 내', () => {
    const extreme = adjustWinProbability(0.5, 10, 0, 8, false);
    expect(extreme).toBeGreaterThanOrEqual(0.02);
    expect(extreme).toBeLessThanOrEqual(0.98);
  });
});
