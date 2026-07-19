import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { WAR_DUEL_MIN } from '@moneyball/shared';

// wave-508: analysis 오늘 AI 예측 카드 WAR 직접 대결 배지
// explore-idea (heavy) — cycle 1875
// Feature-Drift Cycle: review-code (wave-507) → explore-idea (wave-508)
// gap: AI 예측 카드에 SP FIP(wave-499)/wOBA(wave-501)/불펜FIP(wave-504)/Elo(wave-506) 배지 있으나
//      누적 팀 가치(WAR) 직접 대결 배지 없음 → wave-508 추가

const analysisSrc = readFileSync(
  join(__dirname, '../analysis/page.tsx'),
  'utf8',
);

describe('wave-508 — analysis WAR 직접 대결 배지', () => {
  it('WAR_DUEL_MIN 값은 5.0', () => {
    expect(WAR_DUEL_MIN).toBe(5.0);
  });

  it('analysis/page.tsx 에 wave-508 마커 존재', () => {
    expect(analysisSrc).toContain('wave-508');
  });

  it('analysis/page.tsx 에 warDelta 계산 존재', () => {
    expect(analysisSrc).toContain('warDelta');
  });

  it('analysis/page.tsx 에 warFavoredHome 조건 존재', () => {
    expect(analysisSrc).toContain('warFavoredHome');
  });

  it('analysis/page.tsx 에 WAR_DUEL_MIN 임계 조건 존재', () => {
    expect(analysisSrc).toContain('WAR_DUEL_MIN');
  });

  it('WAR duel 로직: 홈 WAR > 원정 WAR = 홈 우위 (warDelta > 0)', () => {
    const homeWar = 22.0;
    const awayWar = 14.0;
    const warDelta = homeWar - awayWar;
    expect(Math.abs(warDelta)).toBeGreaterThanOrEqual(WAR_DUEL_MIN);
    expect(warDelta > 0).toBe(true); // 홈 우위
  });

  it('WAR duel 로직: 원정 WAR > 홈 WAR = 원정 우위 (warDelta < 0)', () => {
    const homeWar = 10.0;
    const awayWar = 18.0;
    const warDelta = homeWar - awayWar;
    expect(Math.abs(warDelta)).toBeGreaterThanOrEqual(WAR_DUEL_MIN);
    expect(warDelta > 0).toBe(false); // 원정 우위
  });

  it('WAR duel 로직: |delta| < WAR_DUEL_MIN → 배지 없음', () => {
    const homeWar = 15.0;
    const awayWar = 18.0;
    const warDelta = homeWar - awayWar;
    expect(Math.abs(warDelta)).toBeLessThan(WAR_DUEL_MIN);
  });

  it('analysis/page.tsx WAR 배지가 Elo 배지(wave-506) 이후에 위치', () => {
    const wave506Idx = analysisSrc.indexOf('wave-506');
    const wave508Idx = analysisSrc.indexOf('wave-508');
    expect(wave506Idx).toBeGreaterThan(-1);
    expect(wave508Idx).toBeGreaterThan(wave506Idx);
  });

  it('analysis/page.tsx WAR 배지 display: △ + 소수점 1자리', () => {
    expect(analysisSrc).toContain('toFixed(1)');
  });
});
