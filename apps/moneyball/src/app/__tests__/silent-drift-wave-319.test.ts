import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEAM_STRENGTH_ELO_DELTA_WINDOW, TEAM_STRENGTH_SNAPSHOT_LIMIT } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 319 — TEAM_STRENGTH_ELO_DELTA_WINDOW single source (cycle 1650)', () => {
  it('TEAM_STRENGTH_ELO_DELTA_WINDOW = 5 (팀 전력 Elo 변화 윈도우)', () => {
    expect(TEAM_STRENGTH_ELO_DELTA_WINDOW).toBe(5);
  });

  it('TEAM_STRENGTH_ELO_DELTA_WINDOW < TEAM_STRENGTH_SNAPSHOT_LIMIT / 10 (버퍼 충분)', () => {
    expect(TEAM_STRENGTH_ELO_DELTA_WINDOW).toBeLessThan(TEAM_STRENGTH_SNAPSHOT_LIMIT / 10);
  });

  it('buildTeamStrengthSnapshot.ts: uses TEAM_STRENGTH_ELO_DELTA_WINDOW, no hardcoded 5 in eloChange logic', () => {
    const src = readFileSync(
      join(ROOT, 'src/lib/teams/buildTeamStrengthSnapshot.ts'),
      'utf8',
    );
    expect(src).toContain('TEAM_STRENGTH_ELO_DELTA_WINDOW');
    expect(src).toContain('eloChange');
    // no hardcoded window value in condition
    expect(src).not.toMatch(/cnt === 5\b/);
  });

  it('TeamStrengthGrid.tsx: imports TEAM_STRENGTH_ELO_DELTA_WINDOW and renders EloDeltaTag', () => {
    const src = readFileSync(
      join(ROOT, 'src/components/analysis/TeamStrengthGrid.tsx'),
      'utf8',
    );
    expect(src).toContain('TEAM_STRENGTH_ELO_DELTA_WINDOW');
    expect(src).toContain('EloDeltaTag');
    expect(src).toContain('eloChange');
  });
});
