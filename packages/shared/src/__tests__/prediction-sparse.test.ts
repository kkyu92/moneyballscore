import { describe, it, expect } from 'vitest';
import { countNeutralFactors, PREDICTION_SPARSE_THRESHOLD } from '../index';

describe('countNeutralFactors — scout #2348 cycle 1399 sparse data detection', () => {
  it('PREDICTION_SPARSE_THRESHOLD = 5 (10 팩터의 50%)', () => {
    expect(PREDICTION_SPARSE_THRESHOLD).toBe(5);
  });

  it('neutral 없음 → 0', () => {
    const factors = { sp_fip: 0.6, lineup_woba: 0.4, elo: 0.55 };
    expect(countNeutralFactors(factors)).toBe(0);
  });

  it('0.5 exact 만 neutral로 카운트 — 0.4999/0.5001 제외', () => {
    const factors = { a: 0.5, b: 0.4999, c: 0.5001, d: 0.5 };
    expect(countNeutralFactors(factors)).toBe(2);
  });

  it('모든 10 팩터 neutral (데이터 완전 결측)', () => {
    const factors: Record<string, number> = {};
    for (let i = 0; i < 10; i++) factors[`f${i}`] = 0.5;
    expect(countNeutralFactors(factors)).toBe(10);
    expect(countNeutralFactors(factors)).toBeGreaterThanOrEqual(PREDICTION_SPARSE_THRESHOLD);
  });

  it('threshold 경계 — 4개 neutral = sparse X', () => {
    const factors = { a: 0.5, b: 0.5, c: 0.5, d: 0.5, e: 0.6 };
    expect(countNeutralFactors(factors)).toBe(4);
    expect(countNeutralFactors(factors) >= PREDICTION_SPARSE_THRESHOLD).toBe(false);
  });

  it('threshold 경계 — 5개 neutral = sparse O', () => {
    const factors = { a: 0.5, b: 0.5, c: 0.5, d: 0.5, e: 0.5, f: 0.6 };
    expect(countNeutralFactors(factors)).toBe(5);
    expect(countNeutralFactors(factors) >= PREDICTION_SPARSE_THRESHOLD).toBe(true);
  });

  it('빈 factors → 0', () => {
    expect(countNeutralFactors({})).toBe(0);
  });
});
