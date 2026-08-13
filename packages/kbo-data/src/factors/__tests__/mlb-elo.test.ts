import { describe, it, expect } from 'vitest';
import {
  MLB_ELO_K,
  MLB_ELO_K_POSTSEASON,
  MLB_ELO_INITIAL_RATING,
  expectedHomeWinProb,
  updateMlbElo,
} from '../mlb-elo';

describe('mlb-elo constants', () => {
  it('MLB_ELO_K = 4 (FiveThirtyEight/Nate Silver 정규시즌)', () => {
    expect(MLB_ELO_K).toBe(4);
  });

  it('MLB_ELO_K_POSTSEASON = 6', () => {
    expect(MLB_ELO_K_POSTSEASON).toBe(6);
  });

  it('MLB_ELO_INITIAL_RATING = ELO_NEUTRAL(1500) 재사용', () => {
    expect(MLB_ELO_INITIAL_RATING).toBe(1500);
  });
});

describe('expectedHomeWinProb', () => {
  it('동일 rating 이면 홈 어드밴티지만큼 50% 초과', () => {
    const p = expectedHomeWinProb(1500, 1500);
    expect(p).toBeGreaterThan(0.5);
    expect(p).toBeCloseTo(0.5345, 3);
  });

  it('홈이 압도적으로 강하면 1에 근접', () => {
    const p = expectedHomeWinProb(1700, 1300);
    expect(p).toBeGreaterThan(0.9);
  });

  it('원정이 압도적으로 강하면 0에 근접', () => {
    const p = expectedHomeWinProb(1300, 1700);
    expect(p).toBeLessThan(0.11);
  });
});

describe('updateMlbElo', () => {
  it('예상대로 홈팀 승리 시 rating 변화 작음 (양수, K 이하)', () => {
    const r = updateMlbElo(1600, 1400, true);
    expect(r.home).toBeGreaterThan(1600);
    expect(r.home - 1600).toBeLessThan(MLB_ELO_K);
  });

  it('업셋(약팀 홈 승) 시 rating 변화 큼 (K 근접)', () => {
    const r = updateMlbElo(1400, 1600, true);
    expect(r.home - 1400).toBeGreaterThan(MLB_ELO_K / 2);
    expect(r.home - 1400).toBeLessThanOrEqual(MLB_ELO_K);
  });

  it('홈팀 패배 시 rating 하락', () => {
    const r = updateMlbElo(1500, 1500, false);
    expect(r.home).toBeLessThan(1500);
    expect(r.away).toBeGreaterThan(1500);
  });

  it('zero-sum — 양팀 변화량 절댓값 동일', () => {
    const before = { home: 1550, away: 1480 };
    const r = updateMlbElo(before.home, before.away, true);
    const homeDelta = r.home - before.home;
    const awayDelta = r.away - before.away;
    expect(homeDelta).toBeCloseTo(-awayDelta, 10);
  });

  it('중립 대결 홈 승 — 델타 = K * (1 - expectedHome)', () => {
    const expected = expectedHomeWinProb(1500, 1500);
    const r = updateMlbElo(1500, 1500, true);
    expect(r.home - 1500).toBeCloseTo(MLB_ELO_K * (1 - expected), 10);
  });

  it('커스텀 k (포스트시즌) 적용 가능', () => {
    const rRegular = updateMlbElo(1500, 1500, true, MLB_ELO_K);
    const rPostseason = updateMlbElo(1500, 1500, true, MLB_ELO_K_POSTSEASON);
    expect(rPostseason.home - 1500).toBeGreaterThan(rRegular.home - 1500);
  });
});
