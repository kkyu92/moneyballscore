import { describe, it, expect } from 'vitest';
import { weekdayOf } from '../page';

describe('cycle 2485 review-code(heavy) — weekdayOf T00:00:00+09:00 off-by-one 정정', () => {
  it('2026-08-24 (실제 월요일) 을 월요일로 반환', () => {
    // KST 자정 오프셋 파싱 버그 시 전날(일요일)로 밀림 — monthGrid.ts 동일 계열 버그
    expect(weekdayOf('2026-08-24')).toBe('월');
  });

  it('연속 7일이 요일 순서대로 순환', () => {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.UTC(2026, 7, 24 + i)).toISOString().slice(0, 10);
      expect(weekdayOf(date)).toBe(days[i]);
    }
  });
});
