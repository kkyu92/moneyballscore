import { describe, it, expect } from 'vitest';
import { computeWinRatePct } from '@/lib/analysis/convergenceRecord';

describe('wave-570: computeWinRatePct', () => {
  it('반올림 정수 % 반환', () => {
    expect(computeWinRatePct(7, 10)).toBe(70);
    expect(computeWinRatePct(2, 3)).toBe(67);
    expect(computeWinRatePct(1, 3)).toBe(33);
  });

  it('0승 → 0%', () => {
    expect(computeWinRatePct(0, 5)).toBe(0);
  });

  it('전승 → 100%', () => {
    expect(computeWinRatePct(5, 5)).toBe(100);
  });
});
