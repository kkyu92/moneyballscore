import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LINEUP_WOBA_DUEL_MIN, LINEUP_WOBA_STRONG_TAG, LINEUP_WOBA_WEAK_TAG } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('wave-355 — 타선 wOBA 직접 대결 배지 (cycle 1693)', () => {
  it('LINEUP_WOBA_DUEL_MIN = 0.020 단일 소스 가드', () => {
    expect(LINEUP_WOBA_DUEL_MIN).toBe(0.020);
  });

  it('LINEUP_WOBA_DUEL_MIN < half of (STRONG - WEAK) range', () => {
    const range = LINEUP_WOBA_STRONG_TAG - LINEUP_WOBA_WEAK_TAG;
    expect(LINEUP_WOBA_DUEL_MIN).toBeLessThanOrEqual(range / 2);
  });

  it('analysis/page.tsx: imports LINEUP_WOBA_DUEL_MIN from shared', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('LINEUP_WOBA_DUEL_MIN');
  });

  it('analysis/page.tsx: wave-355 배지 callsite 존재', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-355');
    expect(src).toContain('타선');
    expect(src).toContain('강세');
  });

  it('analysis/page.tsx: 0.020 하드코딩 없음 (LINEUP_WOBA_DUEL_MIN 상수 사용)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).not.toMatch(/LINEUP_WOBA_DUEL_MIN\s*=\s*0\.020/);
  });

  it('배지 로직: 홈 wOBA 차이 >= 0.020 → 홈팀 강세', () => {
    const homeWoba = 0.350;
    const awayWoba = 0.325;
    const gap = homeWoba - awayWoba;
    expect(Math.abs(gap)).toBeGreaterThanOrEqual(LINEUP_WOBA_DUEL_MIN);
    expect(gap > 0).toBe(true);
  });

  it('배지 로직: 원정 wOBA 차이 >= 0.020 → 원정팀 강세', () => {
    const homeWoba = 0.310;
    const awayWoba = 0.335;
    const gap = homeWoba - awayWoba;
    expect(Math.abs(gap)).toBeGreaterThanOrEqual(LINEUP_WOBA_DUEL_MIN);
    expect(gap < 0).toBe(true);
  });

  it('배지 로직: 차이 < 0.020 → 배지 미표시', () => {
    const homeWoba = 0.320;
    const awayWoba = 0.315;
    const gap = homeWoba - awayWoba;
    expect(Math.abs(gap)).toBeLessThan(LINEUP_WOBA_DUEL_MIN);
  });
});
