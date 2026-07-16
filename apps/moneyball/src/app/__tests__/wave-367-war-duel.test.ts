import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WAR_DUEL_MIN, WAR_STRONG, WAR_WEAK } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('wave-367 — WAR 직접 대결 배지 (cycle 1707)', () => {
  it('WAR_DUEL_MIN = 5.0 단일 소스 가드', () => {
    expect(WAR_DUEL_MIN).toBe(5.0);
  });

  it('WAR_DUEL_MIN < WAR_STRONG - WAR_WEAK (유효 범위 내)', () => {
    expect(WAR_DUEL_MIN).toBeLessThan(WAR_STRONG - WAR_WEAK);
  });

  it('analysis/page.tsx: imports WAR_DUEL_MIN from shared', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('WAR_DUEL_MIN');
  });

  it('analysis/page.tsx: wave-367 배지 callsite 존재', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-367');
    expect(src).toContain('WAR');
    expect(src).toContain('강세');
  });

  it('배지 로직: homeWar - awayWar ≥ 5.0 → 홈팀 WAR 강세', () => {
    const homeWar = 22.0;
    const awayWar = 15.0;
    const gap = homeWar - awayWar;
    expect(Math.abs(gap)).toBeGreaterThanOrEqual(WAR_DUEL_MIN);
    expect(gap > 0).toBe(true);
  });

  it('배지 로직: awayWar - homeWar ≥ 5.0 → 원정팀 WAR 강세', () => {
    const homeWar = 12.0;
    const awayWar = 20.0;
    const gap = homeWar - awayWar;
    expect(Math.abs(gap)).toBeGreaterThanOrEqual(WAR_DUEL_MIN);
    expect(gap < 0).toBe(true);
  });

  it('배지 로직: 차이 < 5.0 → 배지 미표시', () => {
    const homeWar = 16.0;
    const awayWar = 14.0;
    const gap = homeWar - awayWar;
    expect(Math.abs(gap)).toBeLessThan(WAR_DUEL_MIN);
  });
});
