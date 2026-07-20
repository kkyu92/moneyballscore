import { describe, it, expect } from 'vitest';
import { KBO_SEASON_YEAR, KBO_SEASON_START_DATE } from '@moneyball/shared';

// wave-549: KBO_SEASON_YEAR ↔ KBO_SEASON_START_DATE 연도 일치 불변 guard
//
// 시즌 업그레이드(KBO_SEASON_YEAR 갱신) 시 KBO_SEASON_START_DATE 도 동기 갱신되어야 함.
// slice(0,4) 대신 KBO_SEASON_YEAR 상수 직접 사용으로 silent drift 차단.
//
// 수정 내용:
//   analysis/page.tsx line 2783:
//     `${KBO_SEASON_START_DATE.slice(0, 4)} 시즌...` → `${KBO_SEASON_YEAR} 시즌...`

describe('wave-549: KBO_SEASON_YEAR ↔ KBO_SEASON_START_DATE 연도 일치 불변', () => {
  it('KBO_SEASON_START_DATE 연도 = KBO_SEASON_YEAR (시즌 업그레이드 동기 보장)', () => {
    const yearFromDate = parseInt(KBO_SEASON_START_DATE.slice(0, 4), 10);
    expect(yearFromDate).toBe(KBO_SEASON_YEAR);
  });

  it('KBO_SEASON_START_DATE 형식 — yyyy-MM-dd (slice(0,4) 안전 사전조건)', () => {
    expect(KBO_SEASON_START_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('KBO_SEASON_START_DATE 월 = 04 (KBO 시즌 시작 4월 불변)', () => {
    const month = KBO_SEASON_START_DATE.slice(5, 7);
    expect(month).toBe('04');
  });

  it('KBO_SEASON_START_DATE 일 = 01 (시즌 집계 기준일 4월 1일 불변)', () => {
    const day = KBO_SEASON_START_DATE.slice(8, 10);
    expect(day).toBe('01');
  });
});
