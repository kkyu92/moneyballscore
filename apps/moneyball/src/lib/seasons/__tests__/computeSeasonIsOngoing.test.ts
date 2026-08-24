import { describe, it, expect } from 'vitest';
import { computeCurrentKSTYear, computeSeasonIsOngoing } from '../buildSeasonSummary';

describe('computeCurrentKSTYear — KST 연도 경계 (cycle 2514 review-code heavy off-by-one fix)', () => {
  it('일반 UTC 시각은 로컬 getFullYear() 와 동일 연도', () => {
    expect(computeCurrentKSTYear(new Date('2026-08-24T10:00:00Z'))).toBe(2026);
  });

  it('12/31 15:00 UTC (=1/1 00:00 KST) 부터 새해로 넘어감', () => {
    expect(computeCurrentKSTYear(new Date('2026-12-31T14:59:59Z'))).toBe(2026);
    expect(computeCurrentKSTYear(new Date('2026-12-31T15:00:00Z'))).toBe(2027);
  });
});

describe('computeSeasonIsOngoing (cycle 2514)', () => {
  it('올해(KST) + KS 마무리 전 → 진행 중', () => {
    expect(computeSeasonIsOngoing(2026, new Date('2026-08-24T10:00:00Z'))).toBe(true);
  });

  it('과거 연도는 항상 종료', () => {
    expect(computeSeasonIsOngoing(2025, new Date('2026-08-24T10:00:00Z'))).toBe(false);
  });

  it('11월 10일 KST 이후는 올해라도 종료', () => {
    expect(computeSeasonIsOngoing(2026, new Date('2026-11-10T00:00:01+09:00'))).toBe(false);
  });

  it('KST 연도 경계 직후(1/1 00:00 KST)에는 새해가 올해 취급', () => {
    // 2026-12-31T15:00:00Z = 2027-01-01T00:00:00+09:00
    expect(computeSeasonIsOngoing(2027, new Date('2026-12-31T15:00:00Z'))).toBe(true);
    expect(computeSeasonIsOngoing(2026, new Date('2026-12-31T15:00:00Z'))).toBe(false);
  });
});
