import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');

const TARGETS = [
  'src/app/standings/page.tsx',
  'src/app/about/page.tsx',
  'src/app/glossary/data.ts',
  'src/app/teams/[code]/recent/page.tsx',
  'src/app/teams/[code]/recent/opengraph-image.tsx',
  'src/app/mlb/factors/page.tsx',
  'src/app/en/mlb/factors/page.tsx',
  'src/components/matchup/MatchupFactorCompare.tsx',
  'src/lib/analysis/factor-explanations.ts',
  'src/lib/predictions/factorLabels.ts',
  'src/lib/picks/buildPicksStats.ts',
  'src/lib/players/buildPitcherProfile.ts',
];

describe('silent drift wave 92 — RECENT_FORM_GAMES literal sweep', () => {
  for (const rel of TARGETS) {
    it(`${rel}: no hardcoded "최근 10경기" / "Last 10 Games" / "last-10"`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/최근 10경기/);
      expect(src).not.toMatch(/Last 10 Games/);
      expect(src).not.toMatch(/last-10/);
    });
    it(`${rel}: imports RECENT_FORM_GAMES from @moneyball/shared`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).toMatch(/RECENT_FORM_GAMES/);
    });
  }
});
