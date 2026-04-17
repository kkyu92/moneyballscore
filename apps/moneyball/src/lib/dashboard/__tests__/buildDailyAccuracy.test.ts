import { describe, it, expect } from 'vitest';
import { buildDailyAccuracy } from '../buildDailyAccuracy';

describe('buildDailyAccuracy', () => {
  it('빈 배열 → []', () => {
    expect(buildDailyAccuracy([])).toEqual([]);
  });

  it('1일 1경기', () => {
    expect(
      buildDailyAccuracy([{ game_date: '2026-04-16', is_correct: true }]),
    ).toEqual([{ date: '2026-04-16', accuracy: 100, correct: 1, total: 1 }]);
  });

  it('1일 복수 경기 — 같은 날짜에 집계', () => {
    const out = buildDailyAccuracy([
      { game_date: '2026-04-16', is_correct: true },
      { game_date: '2026-04-16', is_correct: true },
      { game_date: '2026-04-16', is_correct: false },
    ]);
    expect(out).toEqual([
      { date: '2026-04-16', accuracy: 66.7, correct: 2, total: 3 },
    ]);
  });

  it('복수일 gap 포함 → 날짜만 정렬, 비경기일 skip', () => {
    const out = buildDailyAccuracy([
      { game_date: '2026-04-18', is_correct: false },
      { game_date: '2026-04-15', is_correct: true },
      { game_date: '2026-04-15', is_correct: true },
      { game_date: '2026-04-18', is_correct: true },
    ]);
    expect(out).toEqual([
      { date: '2026-04-15', accuracy: 100, correct: 2, total: 2 },
      { date: '2026-04-18', accuracy: 50, correct: 1, total: 2 },
    ]);
  });
});
