import { describe, it, expect } from 'vitest';
import type { PickPollEntry, PickPollResult } from '@/app/api/picks/poll/route';

// buildPickPoll: aggregate raw rows into poll entries
function buildPickPoll(
  ids: number[],
  rows: Array<{ game_id: number; pick: string }>,
): PickPollResult {
  const result: PickPollResult = {};
  for (const id of ids) {
    result[id] = { home: 0, away: 0, total: 0 };
  }
  for (const row of rows) {
    const entry = result[row.game_id];
    if (!entry) continue;
    if (row.pick === 'home') {
      entry.home++;
      entry.total++;
    } else if (row.pick === 'away') {
      entry.away++;
      entry.total++;
    }
  }
  return result;
}

describe('buildPickPoll', () => {
  it('returns zeros for game with no picks', () => {
    const result = buildPickPoll([1], []);
    expect(result[1]).toEqual({ home: 0, away: 0, total: 0 });
  });

  it('counts home and away picks correctly', () => {
    const rows = [
      { game_id: 1, pick: 'home' },
      { game_id: 1, pick: 'home' },
      { game_id: 1, pick: 'away' },
    ];
    const result = buildPickPoll([1], rows);
    expect(result[1]).toEqual({ home: 2, away: 1, total: 3 });
  });

  it('handles multiple games independently', () => {
    const rows = [
      { game_id: 1, pick: 'home' },
      { game_id: 2, pick: 'away' },
      { game_id: 2, pick: 'away' },
    ];
    const result = buildPickPoll([1, 2], rows);
    expect(result[1]).toEqual({ home: 1, away: 0, total: 1 });
    expect(result[2]).toEqual({ home: 0, away: 2, total: 2 });
  });

  it('ignores rows for unregistered game ids', () => {
    const rows = [{ game_id: 99, pick: 'home' }];
    const result = buildPickPoll([1], rows);
    expect(result[1]).toEqual({ home: 0, away: 0, total: 0 });
    expect(result[99]).toBeUndefined();
  });

  it('ignores invalid pick values', () => {
    const rows = [
      { game_id: 1, pick: 'invalid' },
      { game_id: 1, pick: 'home' },
    ];
    const result = buildPickPoll([1], rows);
    // invalid pick doesn't increment home/away but also not total via the guard
    expect(result[1]).toEqual({ home: 1, away: 0, total: 1 });
  });
});

describe('PickPollEntry percentage logic', () => {
  it('computes correct home percentage', () => {
    const entry: PickPollEntry = { home: 3, away: 7, total: 10 };
    const homePct = Math.round((entry.home / entry.total) * 100);
    expect(homePct).toBe(30);
  });

  it('handles equal split', () => {
    const entry: PickPollEntry = { home: 5, away: 5, total: 10 };
    const homePct = Math.round((entry.home / entry.total) * 100);
    expect(homePct).toBe(50);
  });

  it('handles all-home edge case', () => {
    const entry: PickPollEntry = { home: 10, away: 0, total: 10 };
    const homePct = Math.round((entry.home / entry.total) * 100);
    expect(homePct).toBe(100);
  });
});
