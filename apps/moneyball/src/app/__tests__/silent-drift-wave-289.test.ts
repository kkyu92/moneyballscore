import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { USER_LEADERBOARD_DISPLAY_LIMIT } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

const TARGET_FILES = [
  'src/lib/leaderboard/server.ts',
  'src/components/leaderboard/LeaderboardTable.tsx',
  'src/components/leaderboard/LeaderboardSortControl.tsx',
] as const;

describe('silent drift wave 289 — user leaderboard display limit hardcoded 50 → USER_LEADERBOARD_DISPLAY_LIMIT', () => {
  it.each(TARGET_FILES)(
    '%s: no hardcoded "limit = 50" or "length: 50" or ">= 50" literal',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/limit\s*=\s*50[^0-9]/);
      expect(src).not.toMatch(/length:\s*50[^0-9]/);
      expect(src).not.toMatch(/>=\s*50[^0-9]/);
    },
  );

  it.each(TARGET_FILES)(
    '%s: imports USER_LEADERBOARD_DISPLAY_LIMIT from @moneyball/shared',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).toMatch(/USER_LEADERBOARD_DISPLAY_LIMIT/);
    },
  );

  it('USER_LEADERBOARD_DISPLAY_LIMIT constant value check', () => {
    expect(USER_LEADERBOARD_DISPLAY_LIMIT).toBe(50);
  });
});
