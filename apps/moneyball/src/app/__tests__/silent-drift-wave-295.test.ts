import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEAM_UPCOMING_LIMIT } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 295 — TEAM_UPCOMING_LIMIT registry derive', () => {
  it('TEAM_UPCOMING_LIMIT is a positive integer', () => {
    expect(typeof TEAM_UPCOMING_LIMIT).toBe('number');
    expect(Number.isInteger(TEAM_UPCOMING_LIMIT)).toBe(true);
    expect(TEAM_UPCOMING_LIMIT).toBeGreaterThan(0);
  });

  it('TEAM_UPCOMING_LIMIT value matches expected 7', () => {
    expect(TEAM_UPCOMING_LIMIT).toBe(7);
  });

  it('buildTeamUpcoming.ts uses TEAM_UPCOMING_LIMIT (no hardcoded .limit(N))', () => {
    const src = readFileSync(
      join(ROOT, 'src/lib/teams/buildTeamUpcoming.ts'),
      'utf8',
    );
    expect(src).toContain('TEAM_UPCOMING_LIMIT');
    expect(src).not.toMatch(/\.limit\(\s*[0-9]+\s*\)/);
  });

  it('teams/[code]/page.tsx imports buildTeamUpcoming', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/teams/[code]/page.tsx'),
      'utf8',
    );
    expect(src).toContain('buildTeamUpcoming');
  });

  it('teams/[code]/page.tsx renders 예정 경기 section', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/teams/[code]/page.tsx'),
      'utf8',
    );
    expect(src).toContain('예정 경기');
  });
});
