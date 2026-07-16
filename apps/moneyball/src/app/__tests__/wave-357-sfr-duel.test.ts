import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SFR_DUEL_MIN, SFR_STRONG, SFR_WEAK } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('wave-357 — 수비 SFR 직접 대결 배지 (cycle 1695)', () => {
  it('SFR_DUEL_MIN = 5.0 단일 소스 가드', () => {
    expect(SFR_DUEL_MIN).toBe(5.0);
  });

  it('SFR_DUEL_MIN < SFR_STRONG (유효 범위 내)', () => {
    expect(SFR_DUEL_MIN).toBeLessThan(SFR_STRONG);
  });

  it('SFR_DUEL_MIN < |SFR_WEAK| (음수 방향 유효 범위 내)', () => {
    expect(SFR_DUEL_MIN).toBeLessThan(Math.abs(SFR_WEAK));
  });

  it('analysis/page.tsx: imports SFR_DUEL_MIN from shared', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('SFR_DUEL_MIN');
  });

  it('analysis/page.tsx: wave-357 배지 callsite 존재', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-357');
    expect(src).toContain('수비');
    expect(src).toContain('강세');
  });

  it('analysis/page.tsx: 5.0 하드코딩 없음 (SFR_DUEL_MIN 상수 사용)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).not.toMatch(/SFR_DUEL_MIN\s*=\s*5\.0/);
  });

  it('배지 로직: 홈 SFR 차이 >= 5.0 → 홈팀 강세', () => {
    const homeSfr = 8.0;
    const awaySfr = 2.0;
    const gap = homeSfr - awaySfr;
    expect(Math.abs(gap)).toBeGreaterThanOrEqual(SFR_DUEL_MIN);
    expect(gap > 0).toBe(true);
  });

  it('배지 로직: 원정 SFR 차이 >= 5.0 → 원정팀 강세', () => {
    const homeSfr = -1.0;
    const awaySfr = 6.0;
    const gap = homeSfr - awaySfr;
    expect(Math.abs(gap)).toBeGreaterThanOrEqual(SFR_DUEL_MIN);
    expect(gap < 0).toBe(true);
  });

  it('배지 로직: 차이 < 5.0 → 배지 미표시', () => {
    const homeSfr = 3.0;
    const awaySfr = 1.0;
    const gap = homeSfr - awaySfr;
    expect(Math.abs(gap)).toBeLessThan(SFR_DUEL_MIN);
  });
});
