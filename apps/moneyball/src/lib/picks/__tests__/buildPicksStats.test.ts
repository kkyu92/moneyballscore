import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildPickEntries, buildPicksStats, buildWeeklyStats } from '../buildPicksStats';
import type { PickGameResult } from '@/app/api/picks/results/route';
import type { UserPicksStore } from '@/hooks/use-user-picks';

const HOME_TEAM = { id: 1, name_ko: 'LG', code: 'LG' };
const AWAY_TEAM = { id: 2, name_ko: '두산', code: 'OB' };

function makeResult(id: number, homeScore: number, awayScore: number): PickGameResult {
  return {
    id,
    game_date: `2026-05-${String(id).padStart(2, '0')}`,
    home_score: homeScore,
    away_score: awayScore,
    status: 'final',
    home_team: HOME_TEAM,
    away_team: AWAY_TEAM,
    ai_predicted_winner_id: homeScore > awayScore ? HOME_TEAM.id : AWAY_TEAM.id,
    ai_confidence: 0.65,
    ai_is_correct: homeScore !== awayScore ? (homeScore > awayScore ? true : false) : null,
  };
}

function makePicks(entries: Array<[number, 'home' | 'away', string]>): UserPicksStore {
  const store: UserPicksStore = {};
  for (const [id, pick, pickedAt] of entries) {
    store[String(id)] = { pick, pickedAt };
  }
  return store;
}

describe('buildPickEntries', () => {
  it('returns empty array for empty picks', () => {
    expect(buildPickEntries({}, [])).toEqual([]);
  });

  it('marks game without result as unresolved', () => {
    const picks = makePicks([[1, 'home', '2026-05-10T10:00:00Z']]);
    const entries = buildPickEntries(picks, []);
    expect(entries[0].isResolved).toBe(false);
    expect(entries[0].myIsCorrect).toBeNull();
  });

  it('correctly identifies home win pick as correct', () => {
    const picks = makePicks([[1, 'home', '2026-05-10T10:00:00Z']]);
    const results = [makeResult(1, 5, 3)]; // home wins
    const entries = buildPickEntries(picks, results);
    expect(entries[0].isResolved).toBe(true);
    expect(entries[0].myIsCorrect).toBe(true);
  });

  it('correctly identifies home win pick as wrong when away wins', () => {
    const picks = makePicks([[1, 'home', '2026-05-10T10:00:00Z']]);
    const results = [makeResult(1, 2, 5)]; // away wins
    const entries = buildPickEntries(picks, results);
    expect(entries[0].myIsCorrect).toBe(false);
  });

  it('correctly identifies away pick', () => {
    const picks = makePicks([[1, 'away', '2026-05-10T10:00:00Z']]);
    const results = [makeResult(1, 2, 5)]; // away wins
    const entries = buildPickEntries(picks, results);
    expect(entries[0].myIsCorrect).toBe(true);
  });

  it('sorts entries by pickedAt descending', () => {
    const picks = makePicks([
      [1, 'home', '2026-05-08T10:00:00Z'],
      [2, 'home', '2026-05-10T10:00:00Z'],
    ]);
    const results = [makeResult(1, 5, 3), makeResult(2, 4, 2)];
    const entries = buildPickEntries(picks, results);
    expect(entries[0].gameId).toBe(2);
    expect(entries[1].gameId).toBe(1);
  });
});

describe('buildPicksStats', () => {
  it('returns zero stats for empty entries', () => {
    const stats = buildPicksStats([]);
    expect(stats.total).toBe(0);
    expect(stats.resolved).toBe(0);
    expect(stats.myRate).toBeNull();
    expect(stats.currentStreak).toBe(0);
  });

  it('computes correct accuracy rates', () => {
    const picks = makePicks([
      [1, 'home', '2026-05-10T10:00:00Z'],
      [2, 'away', '2026-05-09T10:00:00Z'],
      [3, 'home', '2026-05-08T10:00:00Z'],
    ]);
    // game 1: home pick, home wins → correct
    // game 2: away pick, away wins → correct
    // game 3: home pick, away wins → wrong
    const results = [makeResult(1, 5, 2), makeResult(2, 1, 3), makeResult(3, 1, 4)];
    const entries = buildPickEntries(picks, results);
    const stats = buildPicksStats(entries);
    expect(stats.total).toBe(3);
    expect(stats.resolved).toBe(3);
    expect(stats.myCorrect).toBe(2);
    expect(stats.myRate).toBeCloseTo(2 / 3);
    expect(stats.aiResolved).toBe(3);
  });

  it('excludes games without AI prediction from aiRate denominator', () => {
    const picks = makePicks([
      [1, 'home', '2026-05-10T10:00:00Z'],
      [2, 'home', '2026-05-09T10:00:00Z'],
    ]);
    const results: PickGameResult[] = [
      makeResult(1, 5, 2), // AI correct
      {
        ...makeResult(2, 4, 1),
        ai_predicted_winner_id: null,
        ai_is_correct: null, // no AI prediction
      },
    ];
    const entries = buildPickEntries(picks, results);
    const stats = buildPicksStats(entries);
    expect(stats.resolved).toBe(2);
    expect(stats.aiResolved).toBe(1); // only game 1 has AI prediction
    expect(stats.aiCorrect).toBe(1);
    expect(stats.aiRate).toBeCloseTo(1); // 1/1, not 1/2
  });

  it('computes currentStreak from most recent consecutive wins', () => {
    // sorted most recent first: game3(correct), game2(correct), game1(wrong)
    const picks = makePicks([
      [3, 'home', '2026-05-10T10:00:00Z'], // most recent
      [2, 'home', '2026-05-09T10:00:00Z'],
      [1, 'home', '2026-05-08T10:00:00Z'],
    ]);
    const results = [
      makeResult(3, 5, 2), // home win → correct
      makeResult(2, 4, 1), // home win → correct
      makeResult(1, 0, 3), // away win → wrong
    ];
    const entries = buildPickEntries(picks, results);
    const stats = buildPicksStats(entries);
    expect(stats.currentStreak).toBe(2);
  });

  it('streak is 0 when most recent pick was wrong', () => {
    const picks = makePicks([
      [2, 'home', '2026-05-10T10:00:00Z'], // most recent, wrong
      [1, 'home', '2026-05-09T10:00:00Z'], // correct
    ]);
    const results = [makeResult(2, 0, 3), makeResult(1, 5, 2)];
    const entries = buildPickEntries(picks, results);
    const stats = buildPicksStats(entries);
    expect(stats.currentStreak).toBe(0);
  });

  it('recentDots has at most 10 items in oldest-to-newest order', () => {
    const picks = makePicks(
      Array.from({ length: 15 }, (_, i) => [
        i + 1,
        'home' as const,
        `2026-05-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      ]),
    );
    const results = Array.from({ length: 15 }, (_, i) => makeResult(i + 1, 5, 2));
    const entries = buildPickEntries(picks, results);
    const stats = buildPicksStats(entries);
    expect(stats.recentDots).toHaveLength(10);
  });

  it('detects upward trend', () => {
    // recent 5: 4/5 correct, prev 5: 1/5 correct → up
    const picks = makePicks([
      ...Array.from({ length: 5 }, (_, i) => [
        10 + i,
        'home' as const,
        `2026-05-${10 + i}T10:00:00Z`,
      ] as [number, 'home' | 'away', string]),
      ...Array.from({ length: 5 }, (_, i) => [
        i + 1,
        'home' as const,
        `2026-05-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      ] as [number, 'home' | 'away', string]),
    ]);
    // recent 5 (id 10-14): home wins (correct)
    const recentResults = Array.from({ length: 5 }, (_, i) => makeResult(10 + i, 5, 2));
    // prev 5 (id 1-5): away wins (wrong for home pick)
    const prevResults = Array.from({ length: 5 }, (_, i) => makeResult(i + 1, 0, 3));
    const entries = buildPickEntries(picks, [...recentResults, ...prevResults]);
    const stats = buildPicksStats(entries);
    expect(stats.trend).toBe('up');
  });
});

describe('pickingStreakDays', () => {
  // fake time: 2026-05-12T10:00:00Z → KST 19:00 → today KST = "2026-05-12"
  const FAKE_NOW = new Date('2026-05-12T10:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FAKE_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeEntryWithPickedAt(id: number, pickedAt: string): ReturnType<typeof buildPickEntries>[number] {
    return {
      gameId: id,
      game_date: pickedAt.slice(0, 10),
      myPick: 'home',
      pickedAt,
      homeTeamName: 'LG',
      awayTeamName: '두산',
      homeScore: null,
      awayScore: null,
      status: null,
      isResolved: false,
      myIsCorrect: null,
      aiIsCorrect: null,
      aiPredictedHome: null,
    };
  }

  it('returns 0 for empty entries', () => {
    const stats = buildPicksStats([]);
    expect(stats.pickingStreakDays).toBe(0);
  });

  it('returns 1 when picked only today (KST)', () => {
    // 2026-05-12T03:00:00Z = 2026-05-12 12:00 KST
    const entries = [makeEntryWithPickedAt(1, '2026-05-12T03:00:00Z')];
    const stats = buildPicksStats(entries);
    expect(stats.pickingStreakDays).toBe(1);
  });

  it('returns 1 when picked only yesterday (KST)', () => {
    // 2026-05-11T03:00:00Z = 2026-05-11 12:00 KST → yesterday
    const entries = [makeEntryWithPickedAt(1, '2026-05-11T03:00:00Z')];
    const stats = buildPicksStats(entries);
    expect(stats.pickingStreakDays).toBe(1);
  });

  it('returns 3 for 3 consecutive days ending today', () => {
    const entries = [
      makeEntryWithPickedAt(1, '2026-05-12T03:00:00Z'), // today
      makeEntryWithPickedAt(2, '2026-05-11T03:00:00Z'), // yesterday
      makeEntryWithPickedAt(3, '2026-05-10T03:00:00Z'), // 2 days ago
    ];
    const stats = buildPicksStats(entries);
    expect(stats.pickingStreakDays).toBe(3);
  });

  it('breaks streak on a missing day', () => {
    const entries = [
      makeEntryWithPickedAt(1, '2026-05-12T03:00:00Z'), // today
      // 2026-05-11 missing
      makeEntryWithPickedAt(2, '2026-05-10T03:00:00Z'), // 2 days ago
    ];
    const stats = buildPicksStats(entries);
    expect(stats.pickingStreakDays).toBe(1);
  });

  it('returns 0 when most recent pick is older than yesterday', () => {
    const entries = [
      makeEntryWithPickedAt(1, '2026-05-10T03:00:00Z'), // 2 days ago
    ];
    const stats = buildPicksStats(entries);
    expect(stats.pickingStreakDays).toBe(0);
  });

  it('counts multiple picks on same day as 1 day', () => {
    const entries = [
      makeEntryWithPickedAt(1, '2026-05-12T03:00:00Z'),
      makeEntryWithPickedAt(2, '2026-05-12T05:00:00Z'), // same KST day
      makeEntryWithPickedAt(3, '2026-05-11T03:00:00Z'),
    ];
    const stats = buildPicksStats(entries);
    expect(stats.pickingStreakDays).toBe(2);
  });
});

// 2026-05-12 is a Tuesday in KST. Week = Mon 2026-05-11 ~ Sun 2026-05-17.
const WEEK_NOW = new Date('2026-05-12T10:00:00Z'); // 19:00 KST Tuesday

describe('buildWeeklyStats', () => {
  function makeEntry(id: number, gameDate: string, isResolved: boolean, myIsCorrect: boolean | null, aiIsCorrect: boolean | null) {
    return {
      gameId: id,
      game_date: gameDate,
      myPick: 'home' as const,
      pickedAt: `${gameDate}T03:00:00Z`,
      homeTeamName: 'LG',
      awayTeamName: '두산',
      homeScore: isResolved ? (myIsCorrect ? 5 : 1) : null,
      awayScore: isResolved ? (myIsCorrect ? 1 : 5) : null,
      status: isResolved ? 'final' : null,
      isResolved,
      myIsCorrect,
      aiIsCorrect,
      aiPredictedHome: null,
    };
  }

  it('returns null when no entries in current week', () => {
    const entries = [makeEntry(1, '2026-05-04', true, true, true)]; // last week
    expect(buildWeeklyStats(entries, WEEK_NOW)).toBeNull();
  });

  it('includes only entries in current week', () => {
    const entries = [
      makeEntry(1, '2026-05-11', true, true, true),  // Monday this week ✓
      makeEntry(2, '2026-05-12', true, false, true), // Tuesday this week ✓
      makeEntry(3, '2026-05-10', true, true, true),  // last Sunday ✗
    ];
    const result = buildWeeklyStats(entries, WEEK_NOW);
    expect(result).not.toBeNull();
    expect(result!.total).toBe(2);
    expect(result!.myCorrect).toBe(1);
  });

  it('computes weekLabel for same month', () => {
    const result = buildWeeklyStats([makeEntry(1, '2026-05-12', false, null, null)], WEEK_NOW);
    expect(result!.weekLabel).toBe('5월 11일~17일');
  });

  it('computes myRate and aiRate correctly', () => {
    const entries = [
      makeEntry(1, '2026-05-11', true, true, true),   // my ✓, AI ✓
      makeEntry(2, '2026-05-12', true, true, false),   // my ✓, AI ✗
      makeEntry(3, '2026-05-13', true, false, null),   // my ✗, AI no pred
    ];
    const result = buildWeeklyStats(entries, WEEK_NOW)!;
    expect(result.resolved).toBe(3);
    expect(result.myCorrect).toBe(2);
    expect(result.myRate).toBeCloseTo(2 / 3);
    expect(result.aiResolved).toBe(2);
    expect(result.aiCorrect).toBe(1);
    expect(result.aiRate).toBeCloseTo(0.5);
  });

  it('returns null for empty entries', () => {
    expect(buildWeeklyStats([], WEEK_NOW)).toBeNull();
  });

  it('handles unresolved picks in weekly total', () => {
    const entries = [
      makeEntry(1, '2026-05-11', true, true, true),
      makeEntry(2, '2026-05-17', false, null, null), // Sunday, not resolved
    ];
    const result = buildWeeklyStats(entries, WEEK_NOW)!;
    expect(result.total).toBe(2);
    expect(result.resolved).toBe(1);
    expect(result.myRate).toBeCloseTo(1);
  });
});
