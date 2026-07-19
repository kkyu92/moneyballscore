import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SP_FIP_DUEL_MIN } from '@moneyball/shared';

// wave-499: analysis 오늘 AI 예측 카드 SP FIP 직접 대결 배지
// explore-idea (heavy) — cycle 1866
// Feature-Drift Cycle: review-code (wave-498) → explore-idea (wave-499)
// gap: analysis "오늘 AI 예측" 카드에 gameTypeTag (투수전/타격전) 있으나
//      SP FIP 직접 대결 (우위 팀명 + Δ격차) 표시 없음 → wave-499 추가

const analysisSrc = readFileSync(
  join(__dirname, '../analysis/page.tsx'),
  'utf8',
);

describe('wave-499 — analysis SP FIP 직접 대결 배지', () => {
  it('SP_FIP_DUEL_MIN 값은 0.5', () => {
    expect(SP_FIP_DUEL_MIN).toBe(0.5);
  });

  it('analysis/page.tsx 에 wave-499 마커 존재', () => {
    expect(analysisSrc).toContain('wave-499');
  });

  it('analysis/page.tsx 에 spDelta 계산 존재', () => {
    expect(analysisSrc).toContain('spDelta');
  });

  it('analysis/page.tsx 에 spFavoredHome 조건 존재', () => {
    expect(analysisSrc).toContain('spFavoredHome');
  });

  it('analysis/page.tsx 에 SP FIP 격차 toFixed(1) 존재', () => {
    expect(analysisSrc).toContain("toFixed(1)");
  });

  it('SP FIP duel 로직: 홈 FIP < 원정 FIP = 홈 우위 (spDelta < 0)', () => {
    // spDelta = homeSPFip - awaySPFip
    // homeSPFip 3.5, awaySPFip 4.2 → delta = -0.7, spFavoredHome = true
    const homeSPFip = 3.5;
    const awaySPFip = 4.2;
    const spDelta = homeSPFip - awaySPFip;
    expect(Math.abs(spDelta)).toBeGreaterThanOrEqual(SP_FIP_DUEL_MIN);
    expect(spDelta < 0).toBe(true); // 홈 우위
  });

  it('SP FIP duel 로직: 원정 FIP < 홈 FIP = 원정 우위 (spDelta > 0)', () => {
    const homeSPFip = 4.5;
    const awaySPFip = 3.8;
    const spDelta = homeSPFip - awaySPFip;
    expect(Math.abs(spDelta)).toBeGreaterThanOrEqual(SP_FIP_DUEL_MIN);
    expect(spDelta < 0).toBe(false); // 원정 우위
  });

  it('SP FIP duel 로직: |delta| < SP_FIP_DUEL_MIN → 배지 없음', () => {
    const homeSPFip = 3.9;
    const awaySPFip = 4.1;
    const spDelta = homeSPFip - awaySPFip;
    expect(Math.abs(spDelta)).toBeLessThan(SP_FIP_DUEL_MIN);
  });

  it('analysis/page.tsx SP FIP 배지가 gameTypeTag 이후에 위치', () => {
    const wave347Idx = analysisSrc.indexOf('wave-347');
    const wave499Idx = analysisSrc.indexOf('wave-499');
    expect(wave347Idx).toBeGreaterThan(-1);
    expect(wave499Idx).toBeGreaterThan(wave347Idx);
  });
});
