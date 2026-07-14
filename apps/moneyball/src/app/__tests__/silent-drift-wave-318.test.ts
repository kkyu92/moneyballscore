import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ELO_DISPLAY_NEUTRAL_BAND, TEAM_STRENGTH_SNAPSHOT_LIMIT } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 318 — TEAM_STRENGTH_SNAPSHOT_LIMIT + ELO_DISPLAY_NEUTRAL_BAND single source (cycle 1649)', () => {
  it('TEAM_STRENGTH_SNAPSHOT_LIMIT = 200 (팀 전력 스냅샷 쿼리 한도)', () => {
    expect(TEAM_STRENGTH_SNAPSHOT_LIMIT).toBe(200);
  });

  it('ELO_DISPLAY_NEUTRAL_BAND = 10 (Elo 표시용 중립 밴드)', () => {
    expect(ELO_DISPLAY_NEUTRAL_BAND).toBe(10);
  });

  it('buildTeamStrengthSnapshot.ts: no hardcoded ".limit(200)" literal', () => {
    const src = readFileSync(
      join(ROOT, 'src/lib/teams/buildTeamStrengthSnapshot.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/\.limit\(200\)/);
    expect(src).toContain('TEAM_STRENGTH_SNAPSHOT_LIMIT');
  });

  it('TeamStrengthGrid.tsx: no hardcoded "<= 10" neutral band literal', () => {
    const src = readFileSync(
      join(ROOT, 'src/components/analysis/TeamStrengthGrid.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/<=\s*10\b/);
    expect(src).toContain('ELO_DISPLAY_NEUTRAL_BAND');
  });
});
