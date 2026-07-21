import { describe, it, expect } from 'vitest';
import { computeWinRateColorClass } from '@/lib/analysis/convergenceRecord';

describe('wave-574: computeWinRateColorClass', () => {
  it('60% 이상 → green', () => {
    expect(computeWinRateColorClass(60)).toBe('text-green-600 dark:text-green-400');
    expect(computeWinRateColorClass(100)).toBe('text-green-600 dark:text-green-400');
    expect(computeWinRateColorClass(75)).toBe('text-green-600 dark:text-green-400');
  });

  it('40% 이하 → red', () => {
    expect(computeWinRateColorClass(40)).toBe('text-red-500 dark:text-red-400');
    expect(computeWinRateColorClass(0)).toBe('text-red-500 dark:text-red-400');
    expect(computeWinRateColorClass(25)).toBe('text-red-500 dark:text-red-400');
  });

  it('41~59% → 기본 neutral (gray-500)', () => {
    expect(computeWinRateColorClass(50)).toBe('text-gray-500 dark:text-gray-400');
    expect(computeWinRateColorClass(55)).toBe('text-gray-500 dark:text-gray-400');
  });

  it('custom neutral 클래스 전달', () => {
    expect(computeWinRateColorClass(50, 'text-gray-600 dark:text-gray-300')).toBe('text-gray-600 dark:text-gray-300');
    expect(computeWinRateColorClass(50, 'text-amber-600 dark:text-amber-400')).toBe('text-amber-600 dark:text-amber-400');
  });

  it('custom neutral이라도 green/red 임계는 동일', () => {
    expect(computeWinRateColorClass(60, 'text-amber-600 dark:text-amber-400')).toBe('text-green-600 dark:text-green-400');
    expect(computeWinRateColorClass(40, 'text-amber-600 dark:text-amber-400')).toBe('text-red-500 dark:text-red-400');
  });

  it('경계값: 59% / 41% → neutral', () => {
    expect(computeWinRateColorClass(59)).toBe('text-gray-500 dark:text-gray-400');
    expect(computeWinRateColorClass(41)).toBe('text-gray-500 dark:text-gray-400');
  });
});
