import { describe, expect, it } from 'vitest';
import { getKstMonthInfo, buildEmptyGrid } from '../monthGrid';

describe('getKstMonthInfo', () => {
  it('KST 기준 년/월/월label/firstDay/lastDay 도출', () => {
    // 2026-08-14T15:00:00Z = KST 2026-08-15 00:00 (UTC+9)
    const info = getKstMonthInfo(new Date('2026-08-14T15:00:00Z'));
    expect(info.year).toBe(2026);
    expect(info.month).toBe(8);
    expect(info.monthLabel).toBe('2026년 8월');
    expect(info.firstDay).toBe('2026-08-01');
    expect(info.lastDay).toBe('2026-08-31');
  });

  it('KST 자정 경계 — UTC 14:59 은 전날 KST', () => {
    // 2026-08-31T14:59:00Z = KST 2026-08-31 23:59
    const info = getKstMonthInfo(new Date('2026-08-31T14:59:00Z'));
    expect(info.month).toBe(8);
    // 2026-08-31T15:00:00Z = KST 2026-09-01 00:00 → 다음달로 롤오버
    const rolled = getKstMonthInfo(new Date('2026-08-31T15:00:00Z'));
    expect(rolled.month).toBe(9);
  });

  it('2월 윤년/평년 lastDay 정확히 계산', () => {
    const leap = getKstMonthInfo(new Date('2028-02-14T00:00:00Z'));
    expect(leap.lastDay).toBe('2028-02-29');
    const notLeap = getKstMonthInfo(new Date('2026-02-14T00:00:00Z'));
    expect(notLeap.lastDay).toBe('2026-02-28');
  });
});

describe('buildEmptyGrid', () => {
  it('항상 42칸(7x6) 반환', () => {
    const info = getKstMonthInfo(new Date('2026-08-14T00:00:00Z'));
    const cells = buildEmptyGrid(info);
    expect(cells.length).toBe(42);
  });

  it('inMonth 칸 수 = 그 달 일수', () => {
    const info = getKstMonthInfo(new Date('2026-08-14T00:00:00Z'));
    const cells = buildEmptyGrid(info);
    expect(cells.filter((c) => c.inMonth).length).toBe(31);
  });

  it('월요일 시작 정렬 — 그리드 첫 7칸 헤더 순서와 매칭 가능', () => {
    // 2026-08-01 은 토요일 → 월요일 시작 grid 에서 dowMon = (getDay+6)%7 = (6+6)%7 = 5
    const info = getKstMonthInfo(new Date('2026-08-14T00:00:00Z'));
    const cells = buildEmptyGrid(info);
    const firstInMonthIdx = cells.findIndex((c) => c.inMonth);
    expect(firstInMonthIdx).toBe(5);
    expect(cells[firstInMonthIdx].date).toBe('2026-08-01');
  });

  it('모든 칸 초기값 0/null', () => {
    const info = getKstMonthInfo(new Date('2026-08-14T00:00:00Z'));
    const cells = buildEmptyGrid(info);
    for (const c of cells) {
      expect(c.totalPredictions).toBe(0);
      expect(c.verifiedN).toBe(0);
      expect(c.correctN).toBe(0);
      expect(c.accuracyRate).toBeNull();
    }
  });
});
