import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  COMPOSITE_DUEL_THRESHOLD,
  COMPOSITE_DUEL_MIN_VALID,
  LINEUP_WOBA_DUEL_MIN,
  SFR_DUEL_MIN,
  BULLPEN_FIP_DIFF_MIN,
  SP_FIP_DUEL_MIN,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

/** 4팩터 직접 대결 집계 로직 재현 — analysis/page.tsx wave-365 */
function computeComposite(g: {
  homeLineupWoba?: number | null;
  awayLineupWoba?: number | null;
  homeSfr?: number | null;
  awaySfr?: number | null;
  homeBullpenFip?: number | null;
  awayBullpenFip?: number | null;
  homeSPFip?: number | null;
  awaySPFip?: number | null;
}): { favoredHome: boolean; count: number } | null {
  type DuelResult = 'home' | 'away' | null;

  const wobaValid = g.homeLineupWoba != null && g.awayLineupWoba != null;
  const sfrValid = g.homeSfr != null && g.awaySfr != null;
  const bullpenValid = g.homeBullpenFip != null && g.awayBullpenFip != null;
  const spFipValid = g.homeSPFip != null && g.awaySPFip != null;

  const validCount = [wobaValid, sfrValid, bullpenValid, spFipValid].filter(Boolean).length;
  if (validCount < COMPOSITE_DUEL_MIN_VALID) return null;

  const wobaResult: DuelResult = wobaValid
    ? (g.homeLineupWoba! - g.awayLineupWoba! >= LINEUP_WOBA_DUEL_MIN
      ? 'home'
      : g.awayLineupWoba! - g.homeLineupWoba! >= LINEUP_WOBA_DUEL_MIN
        ? 'away'
        : null)
    : null;

  const sfrResult: DuelResult = sfrValid
    ? (g.homeSfr! - g.awaySfr! >= SFR_DUEL_MIN
      ? 'home'
      : g.awaySfr! - g.homeSfr! >= SFR_DUEL_MIN
        ? 'away'
        : null)
    : null;

  const bullpenResult: DuelResult = bullpenValid
    ? (g.awayBullpenFip! - g.homeBullpenFip! >= BULLPEN_FIP_DIFF_MIN
      ? 'home'
      : g.homeBullpenFip! - g.awayBullpenFip! >= BULLPEN_FIP_DIFF_MIN
        ? 'away'
        : null)
    : null;

  const spFipResult: DuelResult = spFipValid
    ? (g.awaySPFip! - g.homeSPFip! >= SP_FIP_DUEL_MIN
      ? 'home'
      : g.homeSPFip! - g.awaySPFip! >= SP_FIP_DUEL_MIN
        ? 'away'
        : null)
    : null;

  const homeWins = [wobaResult, sfrResult, bullpenResult, spFipResult].filter((r) => r === 'home').length;
  const awayWins = [wobaResult, sfrResult, bullpenResult, spFipResult].filter((r) => r === 'away').length;

  if (homeWins < COMPOSITE_DUEL_THRESHOLD && awayWins < COMPOSITE_DUEL_THRESHOLD) return null;
  const favoredHome = homeWins >= COMPOSITE_DUEL_THRESHOLD;
  return { favoredHome, count: favoredHome ? homeWins : awayWins };
}

describe('wave-365 — 종합 우세 배지 (cycle 1705)', () => {
  it('COMPOSITE_DUEL_THRESHOLD = 3 단일 소스 가드', () => {
    expect(COMPOSITE_DUEL_THRESHOLD).toBe(3);
  });

  it('COMPOSITE_DUEL_MIN_VALID = 4 단일 소스 가드', () => {
    expect(COMPOSITE_DUEL_MIN_VALID).toBe(4);
  });

  it('analysis/page.tsx: imports COMPOSITE_DUEL_THRESHOLD, COMPOSITE_DUEL_MIN_VALID', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('COMPOSITE_DUEL_THRESHOLD');
    expect(src).toContain('COMPOSITE_DUEL_MIN_VALID');
  });

  it('analysis/page.tsx: wave-365 배지 callsite 존재', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-365');
    expect(src).toContain('팩터 우세');
  });

  it('홈팀 4/4 우세 → 홈팀 4팩터 우세 배지', () => {
    const result = computeComposite({
      homeLineupWoba: 0.360, awayLineupWoba: 0.320,  // home wins (gap 0.040 >= 0.020)
      homeSfr: 15.0, awaySfr: 5.0,                   // home wins (gap 10 >= 5.0)
      homeBullpenFip: 3.0, awayBullpenFip: 4.5,      // home wins (away-home=1.5 >= 1.0)
      homeSPFip: 3.2, awaySPFip: 3.9,                // home wins (away-home=0.7 >= 0.5)
    });
    expect(result).not.toBeNull();
    expect(result!.favoredHome).toBe(true);
    expect(result!.count).toBe(4);
  });

  it('원정팀 3/4 우세 → 원정팀 3팩터 우세 배지', () => {
    const result = computeComposite({
      homeLineupWoba: 0.320, awayLineupWoba: 0.350,  // away wins (gap 0.030 >= 0.020)
      homeSfr: 5.0, awaySfr: 15.0,                   // away wins (gap 10 >= 5.0)
      homeBullpenFip: 4.5, awayBullpenFip: 3.0,      // away wins (home-away=1.5 >= 1.0)
      homeSPFip: 3.5, awaySPFip: 3.2,                // home wins (home-away=0.3 < 0.5 → no duel)
    });
    expect(result).not.toBeNull();
    expect(result!.favoredHome).toBe(false);
    expect(result!.count).toBe(3);
  });

  it('2/2 분열 (홈 2, 원정 2) → 배지 미표시', () => {
    // home wins wOBA and bullpen, away wins SFR and spFip
    const result2 = computeComposite({
      homeLineupWoba: 0.360, awayLineupWoba: 0.320,  // home
      homeSfr: 5.0, awaySfr: 15.0,                   // away
      homeBullpenFip: 3.0, awayBullpenFip: 4.5,      // home
      homeSPFip: 4.5, awaySPFip: 3.8,                // away (home-away=0.7 >= 0.5 → away wins)
    });
    // homeWins=2, awayWins=2 → no badge
    expect(result2).toBeNull();
  });

  it('validCount < 4 (null 포함) → 배지 미표시', () => {
    const result = computeComposite({
      homeLineupWoba: 0.360, awayLineupWoba: 0.320,  // home wins
      homeSfr: 15.0, awaySfr: 5.0,                   // home wins
      homeBullpenFip: 3.0, awayBullpenFip: 4.5,      // home wins
      homeSPFip: null, awaySPFip: null,               // invalid pair
    });
    expect(result).toBeNull();
  });

  it('정확히 threshold=3/4 홈 우세 → 홈팀 3팩터 우세 배지', () => {
    const result = computeComposite({
      homeLineupWoba: 0.360, awayLineupWoba: 0.320,  // home wins
      homeSfr: 15.0, awaySfr: 5.0,                   // home wins
      homeBullpenFip: 3.0, awayBullpenFip: 4.5,      // home wins
      homeSPFip: 3.8, awaySPFip: 4.0,                // no duel (gap 0.2 < 0.5)
    });
    expect(result).not.toBeNull();
    expect(result!.favoredHome).toBe(true);
    expect(result!.count).toBe(3);
  });

  it('모든 팩터 tie (차이 < 임계) → 배지 미표시', () => {
    const result = computeComposite({
      homeLineupWoba: 0.330, awayLineupWoba: 0.325,  // gap 0.005 < 0.020 → no duel
      homeSfr: 10.0, awaySfr: 9.0,                   // gap 1.0 < 5.0 → no duel
      homeBullpenFip: 3.5, awayBullpenFip: 3.8,      // gap 0.3 < 1.0 → no duel
      homeSPFip: 4.0, awaySPFip: 4.2,                // gap 0.2 < 0.5 → no duel
    });
    expect(result).toBeNull();
  });
});
