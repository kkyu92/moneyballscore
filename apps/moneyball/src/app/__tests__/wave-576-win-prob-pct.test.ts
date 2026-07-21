import { describe, it, expect } from 'vitest';
import { computeWinProbPct } from '@/lib/analysis/convergenceRecord';

describe('wave-576: computeWinProbPct', () => {
  it('homeWinProb 0.6 → 60', () => {
    expect(computeWinProbPct(0.6)).toBe(60);
  });

  it('awayWinProb (1 - homeWinProb) 0.65 → 35', () => {
    expect(computeWinProbPct(1 - 0.65)).toBe(35);
  });

  it('반올림 — 0.556 → 56', () => {
    expect(computeWinProbPct(0.556)).toBe(56);
  });

  it('0.5 → 50', () => {
    expect(computeWinProbPct(0.5)).toBe(50);
  });

  it('1.0 → 100', () => {
    expect(computeWinProbPct(1.0)).toBe(100);
  });

  it('0.0 → 0', () => {
    expect(computeWinProbPct(0.0)).toBe(0);
  });
});
