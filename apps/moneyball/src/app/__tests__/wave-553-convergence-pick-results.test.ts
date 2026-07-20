import { describe, it, expect } from 'vitest';
import { computeConvergenceStreak } from '@/lib/analysis/convergenceRecord';

// wave-553: fetchConvergencePickResults 중복 추출 guard
// getRecentConvergencePickRecord + getConvergencePickStreak 동일 boolean[] 소비
// wins = filter(r=>r).length / losses = length - wins → wins + losses === total 불변

describe('wave-553: fetchConvergencePickResults 추출 contract', () => {
  it('wins + losses === total 불변 (mixed)', () => {
    const results = [true, false, true, true, false];
    const wins = results.filter(r => r).length;
    const losses = results.length - wins;
    expect(wins + losses).toBe(results.length);
    expect(wins).toBe(3);
    expect(losses).toBe(2);
  });

  it('all wins → losses === 0', () => {
    const results = [true, true, true];
    const wins = results.filter(r => r).length;
    expect(results.length - wins).toBe(0);
  });

  it('empty → total 0', () => {
    const results: boolean[] = [];
    expect(results.filter(r => r).length).toBe(0);
    expect(results.length).toBe(0);
  });

  it('동일 배열로 streak + record 양쪽 계산 — integration pattern', () => {
    // fetchConvergencePickResults([true, true, false, true]) 시
    // getConvergencePickStreak → 2연승, getRecentConvergencePickRecord → 3승1패
    const results = [true, true, false, true];
    expect(computeConvergenceStreak(results)).toEqual({ type: 'win', length: 2 });
    const wins = results.filter(r => r).length;
    expect(wins).toBe(3);
    expect(results.length - wins).toBe(1);
  });
});
