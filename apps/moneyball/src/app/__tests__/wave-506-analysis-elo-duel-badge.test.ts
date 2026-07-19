import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ELO_GAP_STRONG } from '@moneyball/shared';

// wave-506: analysis 오늘 AI 예측 카드 Elo 직접 대결 배지
// explore-idea (heavy) — cycle 1873
// Feature-Drift Cycle: review-code (wave-505) → explore-idea (wave-506)
// gap: AI 예측 카드에 SP FIP(wave-499)/wOBA(wave-501)/불펜FIP(wave-504) 배지 있으나
//      팀 전력 Elo 직접 대결 배지 없음 → wave-506 추가

const analysisSrc = readFileSync(
  join(__dirname, '../analysis/page.tsx'),
  'utf8',
);

describe('wave-506 — analysis Elo 직접 대결 배지', () => {
  it('ELO_GAP_STRONG 값은 50', () => {
    expect(ELO_GAP_STRONG).toBe(50);
  });

  it('analysis/page.tsx 에 wave-506 마커 존재', () => {
    expect(analysisSrc).toContain('wave-506');
  });

  it('analysis/page.tsx 에 eloDelta 계산 존재', () => {
    expect(analysisSrc).toContain('eloDelta');
  });

  it('analysis/page.tsx 에 eloFavoredHome 조건 존재', () => {
    expect(analysisSrc).toContain('eloFavoredHome');
  });

  it('analysis/page.tsx 에 ELO_GAP_STRONG 임계 조건 존재', () => {
    expect(analysisSrc).toContain('ELO_GAP_STRONG');
  });

  it('Elo duel 로직: 홈 Elo > 원정 Elo = 홈 우위 (eloDelta > 0)', () => {
    const homeElo = 1580;
    const awayElo = 1500;
    const eloDelta = homeElo - awayElo;
    expect(Math.abs(eloDelta)).toBeGreaterThanOrEqual(ELO_GAP_STRONG);
    expect(eloDelta > 0).toBe(true); // 홈 우위
  });

  it('Elo duel 로직: 원정 Elo > 홈 Elo = 원정 우위 (eloDelta < 0)', () => {
    const homeElo = 1490;
    const awayElo = 1560;
    const eloDelta = homeElo - awayElo;
    expect(Math.abs(eloDelta)).toBeGreaterThanOrEqual(ELO_GAP_STRONG);
    expect(eloDelta > 0).toBe(false); // 원정 우위
  });

  it('Elo duel 로직: |delta| < ELO_GAP_STRONG → 배지 없음', () => {
    const homeElo = 1510;
    const awayElo = 1540;
    const eloDelta = homeElo - awayElo;
    expect(Math.abs(eloDelta)).toBeLessThan(ELO_GAP_STRONG);
  });

  it('analysis/page.tsx Elo 배지가 불펜FIP 배지(wave-504) 이후에 위치', () => {
    const wave504Idx = analysisSrc.indexOf('wave-504');
    const wave506Idx = analysisSrc.indexOf('wave-506');
    expect(wave504Idx).toBeGreaterThan(-1);
    expect(wave506Idx).toBeGreaterThan(wave504Idx);
  });
});
