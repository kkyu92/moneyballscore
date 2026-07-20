import { describe, it, expect } from 'vitest';
import { ACCURACY_GOOD_PCT, CONVERGENCE_BADGE_LOW_PCT } from '@moneyball/shared';

// wave-560: 강수렴 픽 배지 색상 임계 상수 guard test
// analysis/page.tsx wave-557 팀별 배지 + wave-559 홈/어웨이 배지에서
// 인라인 60/40 → ACCURACY_GOOD_PCT / CONVERGENCE_BADGE_LOW_PCT 상수 참조.
//
// 불변:
//   - ACCURACY_GOOD_PCT = 60 (green 임계)
//   - CONVERGENCE_BADGE_LOW_PCT = 40 (red 임계)
//   - LOW < GOOD (3-tier: red / gray / green 보장)
//   - LOW > 0, GOOD < 100 (유효 퍼센트 범위)

describe('wave-560: convergence badge color threshold constants', () => {
  it('ACCURACY_GOOD_PCT = 60', () => {
    expect(ACCURACY_GOOD_PCT).toBe(60);
  });

  it('CONVERGENCE_BADGE_LOW_PCT = 40', () => {
    expect(CONVERGENCE_BADGE_LOW_PCT).toBe(40);
  });

  it('LOW < GOOD (3-tier: red/gray/green 색상 구간 보장)', () => {
    expect(CONVERGENCE_BADGE_LOW_PCT).toBeLessThan(ACCURACY_GOOD_PCT);
  });

  it('CONVERGENCE_BADGE_LOW_PCT 유효 범위 (0 < LOW < 100)', () => {
    expect(CONVERGENCE_BADGE_LOW_PCT).toBeGreaterThan(0);
    expect(CONVERGENCE_BADGE_LOW_PCT).toBeLessThan(100);
  });

  it('ACCURACY_GOOD_PCT 유효 범위 (0 < GOOD < 100)', () => {
    expect(ACCURACY_GOOD_PCT).toBeGreaterThan(0);
    expect(ACCURACY_GOOD_PCT).toBeLessThan(100);
  });

  describe('3-tier 색상 분류 시뮬레이션', () => {
    const classify = (pct: number) => {
      if (pct >= ACCURACY_GOOD_PCT) return 'green';
      if (pct <= CONVERGENCE_BADGE_LOW_PCT) return 'red';
      return 'gray';
    };

    it('pct=60 (경계) → green', () => {
      expect(classify(60)).toBe('green');
    });

    it('pct=61 → green', () => {
      expect(classify(61)).toBe('green');
    });

    it('pct=40 (경계) → red', () => {
      expect(classify(40)).toBe('red');
    });

    it('pct=39 → red', () => {
      expect(classify(39)).toBe('red');
    });

    it('pct=50 (중간) → gray', () => {
      expect(classify(50)).toBe('gray');
    });

    it('pct=59 (GOOD 직하) → gray', () => {
      expect(classify(59)).toBe('gray');
    });

    it('pct=41 (LOW 직상) → gray', () => {
      expect(classify(41)).toBe('gray');
    });
  });
});
