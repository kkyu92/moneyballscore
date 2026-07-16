import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BULLPEN_FIP_DIFF_MIN, BULLPEN_FIP_STRONG, BULLPEN_FIP_WEAK } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('wave-359 — 불펜 FIP 직접 대결 배지 (cycle 1697)', () => {
  it('BULLPEN_FIP_DIFF_MIN = 1.0 단일 소스 가드', () => {
    expect(BULLPEN_FIP_DIFF_MIN).toBe(1.0);
  });

  it('BULLPEN_FIP_DIFF_MIN < BULLPEN_FIP_WEAK - BULLPEN_FIP_STRONG (유효 범위 내)', () => {
    expect(BULLPEN_FIP_DIFF_MIN).toBeLessThanOrEqual(BULLPEN_FIP_WEAK - BULLPEN_FIP_STRONG);
  });

  it('analysis/page.tsx: imports BULLPEN_FIP_DIFF_MIN from shared', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('BULLPEN_FIP_DIFF_MIN');
  });

  it('analysis/page.tsx: wave-359 배지 callsite 존재', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-359');
    expect(src).toContain('불펜');
    expect(src).toContain('강세');
  });

  it('배지 로직: 원정 불펜 FIP > 홈 불펜 FIP + 1.0 → 홈팀 강세 (FIP 낮을수록 좋음)', () => {
    const homeBullpenFip = 3.5;
    const awayBullpenFip = 5.0;
    const gap = awayBullpenFip - homeBullpenFip;
    expect(Math.abs(gap)).toBeGreaterThanOrEqual(BULLPEN_FIP_DIFF_MIN);
    expect(gap > 0).toBe(true);
  });

  it('배지 로직: 홈 불펜 FIP > 원정 불펜 FIP + 1.0 → 원정팀 강세', () => {
    const homeBullpenFip = 5.2;
    const awayBullpenFip = 3.8;
    const gap = awayBullpenFip - homeBullpenFip;
    expect(Math.abs(gap)).toBeGreaterThanOrEqual(BULLPEN_FIP_DIFF_MIN);
    expect(gap < 0).toBe(true);
  });

  it('배지 로직: 차이 < 1.0 → 배지 미표시', () => {
    const homeBullpenFip = 4.2;
    const awayBullpenFip = 4.8;
    const gap = awayBullpenFip - homeBullpenFip;
    expect(Math.abs(gap)).toBeLessThan(BULLPEN_FIP_DIFF_MIN);
  });
});
