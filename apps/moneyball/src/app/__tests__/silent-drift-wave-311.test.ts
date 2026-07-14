import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ANALYSIS_UPCOMING_LIMIT } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 311 — ANALYSIS_UPCOMING_LIMIT single source (cycle 1642)', () => {
  it('ANALYSIS_UPCOMING_LIMIT = 30 (KBO 하루 5경기 × 6일)', () => {
    expect(ANALYSIS_UPCOMING_LIMIT).toBe(30);
  });

  it('analysis/page.tsx imports ANALYSIS_UPCOMING_LIMIT (no inline 30 hardcoded)', () => {
    const src = readFileSync(join(ROOT, 'src/app/analysis/page.tsx'), 'utf8');
    expect(src).toContain('ANALYSIS_UPCOMING_LIMIT');
    expect(src).not.toMatch(/\.limit\(30\)/);
  });

  it('analysis/page.tsx imports HOME_ELO_BONUS (no inline hardcoded Elo bonus)', () => {
    const src = readFileSync(join(ROOT, 'src/app/analysis/page.tsx'), 'utf8');
    expect(src).toContain('HOME_ELO_BONUS');
    expect(src).not.toMatch(/awayElo - homeElo - 24/);
  });

  it('analysis/page.tsx has getThisWeekRemainingGames function', () => {
    const src = readFileSync(join(ROOT, 'src/app/analysis/page.tsx'), 'utf8');
    expect(src).toContain('getThisWeekRemainingGames');
    expect(src).toContain('thisWeekRemainingGames');
  });

  it('analysis/page.tsx has 이번 주 남은 경기 section', () => {
    const src = readFileSync(join(ROOT, 'src/app/analysis/page.tsx'), 'utf8');
    expect(src).toContain('this-week-remaining-title');
    expect(src).toContain('groupUpcomingByDate');
  });
});
