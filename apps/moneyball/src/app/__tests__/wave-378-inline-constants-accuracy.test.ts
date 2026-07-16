import { describe, it, expect } from 'vitest';
import {
  BRIER_CALIBRATION_OK_GAP,
  ACCURACY_BASELINE,
  ACCURACY_WEAK_RATE,
  ACCURACY_GOOD_RATE,
  ACCURACY_GOOD_PCT,
  ACCURACY_BASELINE_PCT,
  NEUTRAL_FACTOR,
} from '@moneyball/shared';
import { accuracyRateColorClass } from '@/lib/accuracy/buildAccuracyData';
import { selectTopFactors } from '@/lib/insights/topFactors';

describe('wave-378 — inline 상수 단일 source (cycle 1720)', () => {
  it('BRIER_CALIBRATION_OK_GAP = 0.03', () => {
    expect(BRIER_CALIBRATION_OK_GAP).toBe(0.03);
  });

  it('ACCURACY_BASELINE = 0.5 (동전던지기 기준선)', () => {
    expect(ACCURACY_BASELINE).toBe(0.5);
  });

  it('ACCURACY_WEAK_RATE = 0.4', () => {
    expect(ACCURACY_WEAK_RATE).toBe(0.4);
  });

  it('ACCURACY_GOOD_RATE = 0.6', () => {
    expect(ACCURACY_GOOD_RATE).toBeCloseTo(0.6, 5);
  });

  it('ACCURACY_GOOD_PCT = 60', () => {
    expect(ACCURACY_GOOD_PCT).toBe(60);
  });

  it('ACCURACY_BASELINE_PCT = 50', () => {
    expect(ACCURACY_BASELINE_PCT).toBe(50);
  });

  it('NEUTRAL_FACTOR = 0.5 (factor 중립값)', () => {
    expect(NEUTRAL_FACTOR).toBe(0.5);
  });

  describe('accuracyRateColorClass uses ACCURACY constants', () => {
    it('>= ACCURACY_GOOD_RATE → brand color', () => {
      expect(accuracyRateColorClass(0.65)).toContain('brand');
      expect(accuracyRateColorClass(0.6)).toContain('brand');
    });

    it('>= ACCURACY_BASELINE → yellow color', () => {
      expect(accuracyRateColorClass(0.55)).toContain('yellow');
      expect(accuracyRateColorClass(0.5)).toContain('yellow');
    });

    it('< ACCURACY_BASELINE → red color', () => {
      expect(accuracyRateColorClass(0.45)).toContain('red');
    });

    it('asPercent=true: 60 → brand, 50 → yellow', () => {
      expect(accuracyRateColorClass(62, true)).toContain('brand');
      expect(accuracyRateColorClass(50, true)).toContain('yellow');
      expect(accuracyRateColorClass(45, true)).toContain('red');
    });
  });

  describe('selectTopFactors uses NEUTRAL_FACTOR for dist', () => {
    it('factor 0.8 (dist=0.3) ranks above 0.7 (dist=0.2)', () => {
      const factors = { sp_fip: 0.8, bullpen_fip: 0.7 };
      const top = selectTopFactors(factors, 2);
      expect(top[0].key).toBe('sp_fip');
    });

    it('factor 0.2 (dist=0.3 via NEUTRAL_FACTOR) treated as away-favorable', () => {
      const factors = { sp_fip: 0.2 };
      const top = selectTopFactors(factors, 1);
      expect(top[0].favorable).toBe('away');
    });
  });

  describe('BRIER_CALIBRATION_OK_GAP calibration label logic', () => {
    it('gap=0.02 < OK_GAP → 잘 보정됨', () => {
      const gap = 0.02;
      const label = Math.abs(gap) < BRIER_CALIBRATION_OK_GAP ? '잘 보정됨' : gap > 0 ? '과신 경향' : '저신 경향';
      expect(label).toBe('잘 보정됨');
    });

    it('gap=0.05 > OK_GAP, positive → 과신 경향', () => {
      const gap = 0.05;
      const label = Math.abs(gap) < BRIER_CALIBRATION_OK_GAP ? '잘 보정됨' : gap > 0 ? '과신 경향' : '저신 경향';
      expect(label).toBe('과신 경향');
    });

    it('gap=-0.05 > OK_GAP, negative → 저신 경향', () => {
      const gap = -0.05;
      const label = Math.abs(gap) < BRIER_CALIBRATION_OK_GAP ? '잘 보정됨' : gap > 0 ? '과신 경향' : '저신 경향';
      expect(label).toBe('저신 경향');
    });
  });
});
