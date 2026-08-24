import { describe, it, expect } from 'vitest';
import { computeAdjacentDates } from '../adjacentDates';

describe('computeAdjacentDates — predictions/[date] prev/next nav (cycle 2513 off-by-one fix)', () => {
  it('일반 날짜 전날/다음날 정확', () => {
    expect(computeAdjacentDates('2026-08-24')).toEqual({
      prev: '2026-08-23',
      next: '2026-08-25',
    });
  });

  it('월 경계 (말일 → 다음달 1일)', () => {
    expect(computeAdjacentDates('2026-08-31')).toEqual({
      prev: '2026-08-30',
      next: '2026-09-01',
    });
  });

  it('월 경계 (1일 → 전달 말일)', () => {
    expect(computeAdjacentDates('2026-09-01')).toEqual({
      prev: '2026-08-31',
      next: '2026-09-02',
    });
  });

  it('연 경계 (12/31 → 1/1)', () => {
    expect(computeAdjacentDates('2026-12-31')).toEqual({
      prev: '2026-12-30',
      next: '2027-01-01',
    });
  });

  it('구현 방식 회귀 가드 — `${date}T00:00:00+09:00` Date 파싱 재도입 시 KST shift 로 하루씩 밀림 (cycle 2513 원인)', () => {
    const date = '2026-08-24';
    const buggy = new Date(`${date}T00:00:00+09:00`);
    // 버그 재현: UTC 날짜가 이미 하루 당겨져 있음 (원인 증명용, fix 대상 아님)
    expect(buggy.toISOString().slice(0, 10)).toBe('2026-08-23');
  });
});
