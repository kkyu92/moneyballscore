import { describe, it, expect } from 'vitest';
import { buildTierRates, emptyTierRates } from '../tierStats';

describe('buildTierRates', () => {
  it('빈 입력 → 모든 tier zero', () => {
    const rates = buildTierRates([]);
    expect(rates).toEqual(emptyTierRates());
  });

  it('is_correct null row 는 집계 제외', () => {
    const rates = buildTierRates([
      { is_correct: null, reasoning: { homeWinProb: 0.70 } },
    ]);
    expect(rates.confident.total).toBe(0);
  });

  it('winnerProb 기반 3단계 분류 — 각 티어에 정확히 떨어뜨림', () => {
    const rates = buildTierRates([
      { is_correct: true, reasoning: { homeWinProb: 0.75 } },  // confident 적중
      { is_correct: false, reasoning: { homeWinProb: 0.70 } }, // confident 실패
      { is_correct: true, reasoning: { homeWinProb: 0.60 } },  // lean 적중
      { is_correct: true, reasoning: { homeWinProb: 0.45 } },  // lean 적중 (원정 0.55)
      { is_correct: false, reasoning: { homeWinProb: 0.52 } }, // tossup 실패
    ]);

    expect(rates.confident).toEqual({ correct: 1, total: 2 });
    expect(rates.lean).toEqual({ correct: 2, total: 2 });
    expect(rates.tossup).toEqual({ correct: 0, total: 1 });
  });

  it('reasoning 없는 row 는 0.5 → tossup 으로 간주', () => {
    const rates = buildTierRates([
      { is_correct: true, reasoning: null },
      { is_correct: false, reasoning: {} },
    ]);
    expect(rates.tossup.total).toBe(2);
    expect(rates.tossup.correct).toBe(1);
  });
});
