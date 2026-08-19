import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PICKS_STREAK_BADGE_MIN } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

const TARGET_FILES = [
  'src/components/picks/UserVsAIScorecard.tsx',
  'src/components/picks/WeeklyPicksSummary.tsx',
  'src/components/leaderboard/LeaderboardClient.tsx',
  'src/components/leaderboard/LeaderboardTable.tsx',
] as const;

describe('silent drift cycle 2252 — 🔥 픽 스트릭 배지 threshold 하드코딩(2 vs 3) → PICKS_STREAK_BADGE_MIN 단일화', () => {
  it.each(TARGET_FILES)(
    '%s: no hardcoded "current_streak >= N" or "currentStreak >= N" literal',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/current_streak\s*>=\s*\d/);
      expect(src).not.toMatch(/currentStreak\s*>=\s*\d/);
    },
  );

  it.each(TARGET_FILES)(
    '%s: imports PICKS_STREAK_BADGE_MIN from @moneyball/shared',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).toMatch(/PICKS_STREAK_BADGE_MIN/);
    },
  );

  it('PICKS_STREAK_BADGE_MIN constant value check', () => {
    expect(PICKS_STREAK_BADGE_MIN).toBe(2);
  });
});
