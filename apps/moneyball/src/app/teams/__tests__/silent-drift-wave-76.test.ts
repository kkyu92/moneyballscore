import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');

const TARGETS = [
  'src/app/matchup/page.tsx',
  'src/app/matchup/twitter-image.tsx',
  'src/app/matchup/opengraph-image.tsx',
  'src/app/teams/page.tsx',
  'src/app/teams/twitter-image.tsx',
  'src/app/teams/opengraph-image.tsx',
  'src/app/teams/[code]/recent/page.tsx',
  'src/app/teams/[code]/not-found.tsx',
  'src/app/standings/page.tsx',
  'src/app/standings/twitter-image.tsx',
  'src/app/standings/opengraph-image.tsx',
  'src/app/guide/page.tsx',
];

describe('silent drift wave 76 — KBO team count literal sweep', () => {
  for (const rel of TARGETS) {
    it(`${rel}: no hardcoded "KBO 10팀" / "10 teams" / "10팀" literal`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/"KBO 10팀/);
      expect(src).not.toMatch(/'KBO 10팀/);
      expect(src).not.toMatch(/`KBO 10팀/);
      expect(src).not.toMatch(/"10 teams"/);
      expect(src).not.toMatch(/'10 teams'/);
      expect(src).not.toMatch(/`10 teams`/);
    });
    it(`${rel}: imports KBO_TEAM_COUNT from @moneyball/shared`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).toMatch(/KBO_TEAM_COUNT/);
    });
  }
});
