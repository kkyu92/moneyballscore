import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  KBO_TEAMS,
  KBO_STADIUM_SHORT,
  PARK_FACTOR_HITTER_MIN,
  PARK_FACTOR_PITCHER_MAX,
  type TeamCode,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('wave-369 — 구장 팩터 배지 (cycle 1709)', () => {
  it('PARK_FACTOR_HITTER_MIN = 105 (타자 친화 임계)', () => {
    expect(PARK_FACTOR_HITTER_MIN).toBe(105);
  });

  it('PARK_FACTOR_PITCHER_MAX = 95 (투수 친화 임계)', () => {
    expect(PARK_FACTOR_PITCHER_MAX).toBe(95);
  });

  it('SS(삼성) parkPf = 108 — 타자 친화 분류', () => {
    expect(KBO_TEAMS.SS.parkPf).toBeGreaterThanOrEqual(PARK_FACTOR_HITTER_MIN);
  });

  it('WO(키움) parkPf = 92 — 투수 친화 분류', () => {
    expect(KBO_TEAMS.WO.parkPf).toBeLessThanOrEqual(PARK_FACTOR_PITCHER_MAX);
  });

  it('HT(KIA) parkPf = 100 — 중립 (배지 미노출)', () => {
    const pf = KBO_TEAMS.HT.parkPf;
    expect(pf).toBeGreaterThan(PARK_FACTOR_PITCHER_MAX);
    expect(pf).toBeLessThan(PARK_FACTOR_HITTER_MIN);
  });

  it('KBO_STADIUM_SHORT — 모든 10팀 city 값 존재', () => {
    const codes: TeamCode[] = ['SK', 'HT', 'LG', 'OB', 'KT', 'SS', 'LT', 'HH', 'NC', 'WO'];
    for (const code of codes) {
      expect(KBO_STADIUM_SHORT[code]).toBeTruthy();
    }
  });

  it('analysis/page.tsx: PARK_FACTOR_HITTER_MIN / PARK_FACTOR_PITCHER_MAX 사용 (인라인 상수 X)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('PARK_FACTOR_HITTER_MIN');
    expect(src).toContain('PARK_FACTOR_PITCHER_MAX');
    expect(src).not.toMatch(/parkPf >= 105\b/);
    expect(src).not.toMatch(/parkPf <= 95\b/);
  });

  it('analysis/page.tsx: wave-369 badge 존재 + KBO_TEAMS / KBO_STADIUM_SHORT import', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-369');
    expect(src).toContain('KBO_TEAMS');
    expect(src).toContain('KBO_STADIUM_SHORT');
    expect(src).toContain('타자 친화');
    expect(src).toContain('투수 친화');
  });
});
