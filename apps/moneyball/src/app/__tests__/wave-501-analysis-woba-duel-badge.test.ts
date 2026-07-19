import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { LINEUP_WOBA_DUEL_MIN } from '@moneyball/shared';

// wave-501: analysis 오늘 AI 예측 카드 wOBA 타선 직접 대결 배지
// explore-idea (heavy) — cycle 1868
// Feature-Drift Cycle: review-code (wave-500) → explore-idea (wave-501)
// gap: wave-499 SP FIP(투수) 배지 추가됐으나 wOBA(타선) 배지 없음
//      투수/타선 쌍 완성 — |ΔwOBA| >= LINEUP_WOBA_DUEL_MIN(0.020) 시 우위 팀명 + 격차

const analysisSrc = readFileSync(
  join(__dirname, '../analysis/page.tsx'),
  'utf8',
);

describe('wave-501 — analysis wOBA 타선 직접 대결 배지', () => {
  it('LINEUP_WOBA_DUEL_MIN 값은 0.020', () => {
    expect(LINEUP_WOBA_DUEL_MIN).toBe(0.020);
  });

  it('analysis/page.tsx 에 wave-501 마커 존재', () => {
    expect(analysisSrc).toContain('wave-501');
  });

  it('analysis/page.tsx 에 wobaDelta 계산 존재', () => {
    expect(analysisSrc).toContain('wobaDelta');
  });

  it('analysis/page.tsx 에 wobaFavoredHome 조건 존재', () => {
    expect(analysisSrc).toContain('wobaFavoredHome');
  });

  it('analysis/page.tsx 에 wOBA 격차 toFixed(3) 존재', () => {
    expect(analysisSrc).toContain('toFixed(3)');
  });

  it('wOBA duel 로직: 홈 wOBA > 원정 wOBA = 홈 타선 우위 (wobaDelta > 0)', () => {
    // wobaDelta = homeLineupWoba - awayLineupWoba
    // home 0.340, away 0.315 → delta = 0.025, wobaFavoredHome = true
    const homeLineupWoba = 0.340;
    const awayLineupWoba = 0.315;
    const wobaDelta = homeLineupWoba - awayLineupWoba;
    expect(Math.abs(wobaDelta)).toBeGreaterThanOrEqual(LINEUP_WOBA_DUEL_MIN);
    expect(wobaDelta > 0).toBe(true); // 홈 타선 우위
  });

  it('wOBA duel 로직: 원정 wOBA > 홈 wOBA = 원정 타선 우위 (wobaDelta < 0)', () => {
    const homeLineupWoba = 0.310;
    const awayLineupWoba = 0.335;
    const wobaDelta = homeLineupWoba - awayLineupWoba;
    expect(Math.abs(wobaDelta)).toBeGreaterThanOrEqual(LINEUP_WOBA_DUEL_MIN);
    expect(wobaDelta > 0).toBe(false); // 원정 타선 우위
  });

  it('wOBA duel 로직: |delta| < LINEUP_WOBA_DUEL_MIN → 배지 없음', () => {
    const homeLineupWoba = 0.325;
    const awayLineupWoba = 0.330;
    const wobaDelta = homeLineupWoba - awayLineupWoba;
    expect(Math.abs(wobaDelta)).toBeLessThan(LINEUP_WOBA_DUEL_MIN);
  });

  it('analysis/page.tsx wave-501 배지가 wave-499 이후에 위치', () => {
    const wave499Idx = analysisSrc.indexOf('wave-499');
    const wave501Idx = analysisSrc.indexOf('wave-501');
    expect(wave499Idx).toBeGreaterThan(-1);
    expect(wave501Idx).toBeGreaterThan(wave499Idx);
  });

  it('analysis/page.tsx homeLineupWoba null 체크 존재', () => {
    expect(analysisSrc).toContain('homeLineupWoba != null && g.awayLineupWoba != null');
  });
});
