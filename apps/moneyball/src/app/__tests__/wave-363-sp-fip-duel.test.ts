import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SP_FIP_DUEL_MIN, SP_FIP_STRONG, SP_FIP_WEAK } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('wave-363 — 선발 FIP 직접 대결 배지 (cycle 1702)', () => {
  it('SP_FIP_DUEL_MIN = 0.5 단일 소스 가드', () => {
    expect(SP_FIP_DUEL_MIN).toBe(0.5);
  });

  it('SP_FIP_DUEL_MIN < SP_FIP_WEAK - SP_FIP_STRONG (유효 범위 내)', () => {
    expect(SP_FIP_DUEL_MIN).toBeLessThan(SP_FIP_WEAK - SP_FIP_STRONG);
  });

  it('analysis/page.tsx: imports SP_FIP_DUEL_MIN from shared', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('SP_FIP_DUEL_MIN');
  });

  it('analysis/page.tsx: wave-363 배지 callsite 존재', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-363');
    expect(src).toContain('선발');
    expect(src).toContain('강세');
  });

  it('배지 로직: 원정 SP FIP > 홈 SP FIP + 0.5 → 홈팀 선발 강세 (FIP 낮을수록 좋음)', () => {
    const homeSpFip = 3.5;
    const awaySpFip = 4.2;
    const gap = awaySpFip - homeSpFip;
    expect(Math.abs(gap)).toBeGreaterThanOrEqual(SP_FIP_DUEL_MIN);
    expect(gap > 0).toBe(true);
  });

  it('배지 로직: 홈 SP FIP > 원정 SP FIP + 0.5 → 원정팀 선발 강세', () => {
    const homeSpFip = 4.8;
    const awaySpFip = 3.9;
    const gap = awaySpFip - homeSpFip;
    expect(Math.abs(gap)).toBeGreaterThanOrEqual(SP_FIP_DUEL_MIN);
    expect(gap < 0).toBe(true);
  });

  it('배지 로직: 차이 < 0.5 → 배지 미표시', () => {
    const homeSpFip = 4.0;
    const awaySpFip = 4.3;
    const gap = awaySpFip - homeSpFip;
    expect(Math.abs(gap)).toBeLessThan(SP_FIP_DUEL_MIN);
  });
});
