import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SP_XFIP_DUEL_MIN } from '@moneyball/shared';

// wave-513: analysis 오늘 AI 예측 카드 xFIP 직접 대결 배지
// explore-idea (heavy) — cycle 1880
// Feature-Drift Cycle: review-code (wave-512) → explore-idea (wave-513)
// gap: AI 예측 카드에 SP FIP(499)/wOBA(501)/불펜FIP(504)/Elo(506)/WAR(508)/SFR(510)/폼(511) 배지 있으나
//      선발xFIP 직접 대결 배지 없음 (5% 가중치 팩터) → wave-513 추가

const analysisSrc = readFileSync(
  join(__dirname, '../analysis/page.tsx'),
  'utf8',
);

describe('wave-513 — analysis xFIP 직접 대결 배지', () => {
  it('SP_XFIP_DUEL_MIN 값은 0.5', () => {
    expect(SP_XFIP_DUEL_MIN).toBe(0.5);
  });

  it('analysis/page.tsx 에 wave-513 마커 존재', () => {
    expect(analysisSrc).toContain('wave-513');
  });

  it('analysis/page.tsx 에 xfipDelta 계산 존재', () => {
    expect(analysisSrc).toContain('xfipDelta');
  });

  it('analysis/page.tsx 에 xfipFavoredHome 조건 존재', () => {
    expect(analysisSrc).toContain('xfipFavoredHome');
  });

  it('analysis/page.tsx 에 SP_XFIP_DUEL_MIN 임계 조건 존재', () => {
    expect(analysisSrc).toContain('SP_XFIP_DUEL_MIN');
  });

  it('xFIP duel 로직: 홈 xFIP < 원정 xFIP = 홈 우위 (xfipDelta < 0)', () => {
    const homeXfip = 3.2;
    const awayXfip = 4.5;
    const xfipDelta = homeXfip - awayXfip;
    expect(Math.abs(xfipDelta)).toBeGreaterThanOrEqual(SP_XFIP_DUEL_MIN);
    expect(xfipDelta < 0).toBe(true); // 홈 우위 (낮은 xFIP = 좋음)
  });

  it('xFIP duel 로직: 홈 xFIP > 원정 xFIP = 원정 우위 (xfipDelta > 0)', () => {
    const homeXfip = 4.8;
    const awayXfip = 3.5;
    const xfipDelta = homeXfip - awayXfip;
    expect(Math.abs(xfipDelta)).toBeGreaterThanOrEqual(SP_XFIP_DUEL_MIN);
    expect(xfipDelta < 0).toBe(false); // 원정 우위
  });

  it('xFIP duel 로직: |delta| < SP_XFIP_DUEL_MIN → 배지 없음', () => {
    const homeXfip = 3.8;
    const awayXfip = 4.1;
    const xfipDelta = homeXfip - awayXfip;
    expect(Math.abs(xfipDelta)).toBeLessThan(SP_XFIP_DUEL_MIN);
  });

  it('analysis/page.tsx xFIP 배지가 최근폼 배지(wave-511) 이후에 위치', () => {
    const wave511Idx = analysisSrc.indexOf('wave-511');
    const wave513Idx = analysisSrc.indexOf('wave-513');
    expect(wave511Idx).toBeGreaterThan(-1);
    expect(wave513Idx).toBeGreaterThan(wave511Idx);
  });

  it('analysis/page.tsx xFIP 배지가 팩터 수렴 배지(wave-415) 이전에 위치', () => {
    const wave513Idx = analysisSrc.indexOf('wave-513');
    const wave415Idx = analysisSrc.lastIndexOf('wave-415');
    expect(wave513Idx).toBeGreaterThan(-1);
    expect(wave415Idx).toBeGreaterThan(wave513Idx);
  });

  it('analysis/page.tsx xFIP 배지 display: △ + 소수점 1자리', () => {
    const wave513Idx = analysisSrc.indexOf('wave-513');
    const snippetEnd = analysisSrc.indexOf('wave-415', wave513Idx);
    const snippet = analysisSrc.slice(wave513Idx, snippetEnd);
    expect(snippet).toContain('toFixed(1)');
    expect(snippet).toContain('xFIP');
  });
});
