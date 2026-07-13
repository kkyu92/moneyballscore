import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

const TARGET_FILES = [
  'src/app/en/mlb/postseason/page.tsx',
  'src/app/en/mlb/players/[id]/page.tsx',
  'src/app/en/mlb/players/twitter-image.tsx',
  'src/app/en/mlb/players/opengraph-image.tsx',
] as const;

describe('silent drift wave 270 — en/mlb 4 surface "30-team" hardcoded → MLB_TEAM_COUNT registry derive', () => {
  it.each(TARGET_FILES)(
    '%s: no hardcoded "30-team" / "30-Team" literals (MLB team count 문맥)',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/\b30-[Tt]eam\b/);
    },
  );

  it.each(TARGET_FILES)(
    '%s: imports MLB_TEAM_COUNT from @moneyball/shared',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).toMatch(/MLB_TEAM_COUNT/);
    },
  );

  it('packages/shared exports MLB_TEAM_COUNT as derived constant', () => {
    const src = readFileSync(
      join(ROOT, '../../packages/shared/src/index.ts'),
      'utf8',
    );
    expect(src).toMatch(/export const MLB_TEAM_COUNT = Object\.keys\(_MLB_TEAMS\)\.length/);
  });
});
