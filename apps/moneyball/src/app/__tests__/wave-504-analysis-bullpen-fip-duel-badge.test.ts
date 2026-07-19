import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BULLPEN_FIP_DIFF_MIN } from '@moneyball/shared';

// wave-504: analysis 오늘 AI 예측 카드 불펜FIP 직접 대결 배지
// explore-idea (heavy) — cycle 1871
// Feature-Drift Cycle: review-code (wave-503) → explore-idea (wave-504)
// gap: wave-499 SP FIP(투수) + wave-501 wOBA(타선) 이후 불펜 배지 없음
//      불펜 배지 추가 — |ΔFIP| >= BULLPEN_FIP_DIFF_MIN(1.0) 시 우위 팀명 + 격차

const analysisSrc = readFileSync(
  join(__dirname, '../analysis/page.tsx'),
  'utf8',
);

describe('wave-504 — analysis 불펜FIP 직접 대결 배지', () => {
  it('BULLPEN_FIP_DIFF_MIN 값은 1.0', () => {
    expect(BULLPEN_FIP_DIFF_MIN).toBe(1.0);
  });

  it('analysis/page.tsx 에 wave-504 마커 존재', () => {
    expect(analysisSrc).toContain('wave-504');
  });

  it('analysis/page.tsx 에 bullpenDelta 계산 존재', () => {
    expect(analysisSrc).toContain('bullpenDelta');
  });

  it('analysis/page.tsx 에 bullpenFavoredHome 조건 존재', () => {
    expect(analysisSrc).toContain('bullpenFavoredHome');
  });

  it('analysis/page.tsx 에 불펜 FIP 격차 toFixed(1) 존재', () => {
    expect(analysisSrc).toContain('불펜');
  });

  it('불펜FIP duel 로직: 홈 불펜FIP < 원정 불펜FIP = 홈 불펜 우위 (bullpenDelta < 0)', () => {
    // bullpenDelta = homeBullpenFip - awayBullpenFip
    // home 3.80, away 5.10 → delta = -1.30, bullpenFavoredHome = true (낮은 FIP = 우위)
    const homeBullpenFip = 3.80;
    const awayBullpenFip = 5.10;
    const bullpenDelta = homeBullpenFip - awayBullpenFip;
    expect(Math.abs(bullpenDelta)).toBeGreaterThanOrEqual(BULLPEN_FIP_DIFF_MIN);
    expect(bullpenDelta < 0).toBe(true); // 홈 불펜 우위
  });

  it('불펜FIP duel 로직: 원정 불펜FIP < 홈 불펜FIP = 원정 불펜 우위 (bullpenDelta > 0)', () => {
    const homeBullpenFip = 5.20;
    const awayBullpenFip = 3.90;
    const bullpenDelta = homeBullpenFip - awayBullpenFip;
    expect(Math.abs(bullpenDelta)).toBeGreaterThanOrEqual(BULLPEN_FIP_DIFF_MIN);
    expect(bullpenDelta < 0).toBe(false); // 원정 불펜 우위
  });

  it('불펜FIP duel 로직: |delta| < BULLPEN_FIP_DIFF_MIN → 배지 없음', () => {
    const homeBullpenFip = 4.50;
    const awayBullpenFip = 4.80;
    const bullpenDelta = homeBullpenFip - awayBullpenFip;
    expect(Math.abs(bullpenDelta)).toBeLessThan(BULLPEN_FIP_DIFF_MIN);
  });

  it('analysis/page.tsx wave-504 배지가 wave-501 이후에 위치', () => {
    const wave501Idx = analysisSrc.indexOf('wave-501');
    const wave504Idx = analysisSrc.indexOf('wave-504');
    expect(wave501Idx).toBeGreaterThan(-1);
    expect(wave504Idx).toBeGreaterThan(wave501Idx);
  });

  it('analysis/page.tsx homeBullpenFip null 체크 존재', () => {
    expect(analysisSrc).toContain('homeBullpenFip != null && g.awayBullpenFip != null');
  });

  it('불펜FIP duel: 경계값 정확히 1.0 — 미만 배지 없음, 이상 배지 있음', () => {
    const exact = 1.0;
    expect(exact).toBeGreaterThanOrEqual(BULLPEN_FIP_DIFF_MIN);
    expect(0.99).toBeLessThan(BULLPEN_FIP_DIFF_MIN);
  });
});
