import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ACCURACY_GREAT_PCT, ACCURACY_OK_PCT, getAccuracyColor } from '@moneyball/shared';

// wave-498: ACCURACY_GREAT_PCT 상수 추출 — getAccuracyColor `65` 인라인 swap
// review-code (heavy) — cycle 1865
// Feature-Drift Cycle: explore-idea (wave-497) → review-code (wave-498)
// silent drift: getAccuracyColor `65` hardcoded, ACCURACY_OK_PCT=55 이미 존재하나 미참조

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

describe('wave-498 — ACCURACY_GREAT_PCT 상수 swap (getAccuracyColor 임계)', () => {
  it('ACCURACY_GREAT_PCT 값은 65', () => {
    expect(ACCURACY_GREAT_PCT).toBe(65);
  });

  it('ACCURACY_OK_PCT 값은 55 (기존 상수 유지)', () => {
    expect(ACCURACY_OK_PCT).toBe(55);
  });

  it('getAccuracyColor: 65% 이상 → green', () => {
    expect(getAccuracyColor(65)).toBe('text-green-600');
    expect(getAccuracyColor(70)).toBe('text-green-600');
    expect(getAccuracyColor(100)).toBe('text-green-600');
  });

  it('getAccuracyColor: 55~64% → yellow', () => {
    expect(getAccuracyColor(55)).toBe('text-yellow-600');
    expect(getAccuracyColor(60)).toBe('text-yellow-600');
    expect(getAccuracyColor(64)).toBe('text-yellow-600');
  });

  it('getAccuracyColor: 55% 미만 → red', () => {
    expect(getAccuracyColor(54)).toBe('text-red-600');
    expect(getAccuracyColor(0)).toBe('text-red-600');
  });

  it('shared: getAccuracyColor 내 magic `65` 없음', () => {
    const fn = sharedSrc.match(/export function getAccuracyColor[\s\S]*?\n\}/)?.[0] ?? '';
    expect(fn).not.toContain('>= 65');
    expect(fn).toContain('ACCURACY_GREAT_PCT');
  });

  it('shared: getAccuracyColor 내 magic `55` 없음', () => {
    const fn = sharedSrc.match(/export function getAccuracyColor[\s\S]*?\n\}/)?.[0] ?? '';
    expect(fn).not.toContain('>= 55');
    expect(fn).toContain('ACCURACY_OK_PCT');
  });
});
