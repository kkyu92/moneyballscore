import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

const TARGET_FILES = [
  'src/app/mlb/page.tsx',
  'src/app/en/mlb/page.tsx',
  'src/app/mlb/wild-card/page.tsx',
  'src/app/en/mlb/wild-card/page.tsx',
  'src/app/mlb/standings/opengraph-image.tsx',
  'src/app/mlb/standings/twitter-image.tsx',
  'src/app/en/mlb/standings/page.tsx',
  'src/app/en/mlb/standings/opengraph-image.tsx',
  'src/app/en/mlb/standings/twitter-image.tsx',
  'src/app/en/mlb/opengraph-image.tsx',
  'src/app/en/mlb/twitter-image.tsx',
] as const;

describe('silent drift wave 80 — MLB team/division count registry sweep', () => {
  it.each(TARGET_FILES)(
    '%s: no hardcoded "30팀" / "30 teams" / "6 division(s)" / "6 디비전" literals',
    (rel) => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      // template literal `${MLB_TEAM_COUNT}팀` etc. allowed.
      expect(src).not.toMatch(/[^{`]30팀/);
      expect(src).not.toMatch(/[^{`]30 teams\b/);
      expect(src).not.toMatch(/[^{`]30-team\b/);
      expect(src).not.toMatch(/[^{`]6 division\b/);
      expect(src).not.toMatch(/[^{`]6 divisions\b/);
      expect(src).not.toMatch(/[^{`]6 디비전\b/);
    },
  );

  it('packages/shared exports MLB_TEAM_COUNT + MLB_DIVISION_COUNT as derived constants', () => {
    const src = readFileSync(
      join(ROOT, '../../packages/shared/src/index.ts'),
      'utf8',
    );
    expect(src).toMatch(/export const MLB_TEAM_COUNT = Object\.keys\(_MLB_TEAMS\)\.length/);
    expect(src).toMatch(/export const MLB_DIVISION_COUNT/);
  });
});
