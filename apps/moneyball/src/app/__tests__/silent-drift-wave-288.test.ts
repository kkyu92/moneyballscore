import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEADERBOARD_TOP_N } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

const TARGET_FILES = [
  'src/app/players/page.tsx',
  'src/app/players/opengraph-image.tsx',
  'src/app/players/twitter-image.tsx',
] as const;

describe('silent drift wave 288 — players "Top 10" hardcoded → LEADERBOARD_TOP_N', () => {
  it.each(TARGET_FILES)(
    '%s: no hardcoded "limit: 10" literal',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/limit:\s*10[^0-9]/);
    },
  );

  it.each(TARGET_FILES)(
    '%s: no hardcoded "Top 10" string literal',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/"Top 10"/);
    },
  );

  it.each(TARGET_FILES)(
    '%s: imports LEADERBOARD_TOP_N from @moneyball/shared',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).toMatch(/LEADERBOARD_TOP_N/);
    },
  );

  it('LEADERBOARD_TOP_N constant value check', () => {
    expect(LEADERBOARD_TOP_N).toBe(10);
  });
});
