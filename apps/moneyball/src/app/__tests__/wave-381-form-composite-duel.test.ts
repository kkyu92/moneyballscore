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
  WAR_DUEL_MIN,
  ELO_GAP_STRONG,
  RECENT_FORM_DUEL_MIN,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

/** 7팩터 직접 대결 집계 로직 재현 — analysis/page.tsx wave-381 */
function computeComposite(g: {
  homeLineupWoba?: number | null;
  awayLineupWoba?: number | null;
  homeSfr?: number | null;
  awaySfr?: number | null;
  homeBullpenFip?: number | null;
  awayBullpenFip?: number | null;
  homeSPFip?: number | null;
  awaySPFip?: number | null;
  homeWar?: number | null;
  awayWar?: number | null;
  homeElo?: number;
  awayElo?: number;
  homeRecentForm?: number;
  awayRecentForm?: number;
}): { favoredHome: boolean; count: number } | null {
  type DuelResult = 'home' | 'away' | null;

  const wobaResult: DuelResult =
    g.homeLineupWoba != null && g.awayLineupWoba != null
      ? g.homeLineupWoba - g.awayLineupWoba >= LINEUP_WOBA_DUEL_MIN
        ? 'home'
        : g.awayLineupWoba - g.homeLineupWoba >= LINEUP_WOBA_DUEL_MIN
          ? 'away'
          : null
      : null;
  const sfrResult: DuelResult =
    g.homeSfr != null && g.awaySfr != null
      ? g.homeSfr - g.awaySfr >= SFR_DUEL_MIN
        ? 'home'
        : g.awaySfr - g.homeSfr >= SFR_DUEL_MIN
          ? 'away'
          : null
      : null;
  const bullpenResult: DuelResult =
    g.homeBullpenFip != null && g.awayBullpenFip != null
      ? g.awayBullpenFip - g.homeBullpenFip >= BULLPEN_FIP_DIFF_MIN
        ? 'home'
        : g.homeBullpenFip - g.awayBullpenFip >= BULLPEN_FIP_DIFF_MIN
          ? 'away'
          : null
      : null;
  const spFipResult: DuelResult =
    g.homeSPFip != null && g.awaySPFip != null
      ? g.awaySPFip - g.homeSPFip >= SP_FIP_DUEL_MIN
        ? 'home'
        : g.homeSPFip - g.awaySPFip >= SP_FIP_DUEL_MIN
          ? 'away'
          : null
      : null;
  const warResult: DuelResult =
    g.homeWar != null && g.awayWar != null
      ? g.homeWar - g.awayWar >= WAR_DUEL_MIN
        ? 'home'
        : g.awayWar - g.homeWar >= WAR_DUEL_MIN
          ? 'away'
          : null
      : null;
  const eloResult: DuelResult =
    g.homeElo !== undefined && g.awayElo !== undefined
      ? g.homeElo - g.awayElo >= ELO_GAP_STRONG
        ? 'home'
        : g.awayElo - g.homeElo >= ELO_GAP_STRONG
          ? 'away'
          : null
      : null;
  const formResult: DuelResult =
    g.homeRecentForm !== undefined && g.awayRecentForm !== undefined
      ? g.homeRecentForm - g.awayRecentForm >= RECENT_FORM_DUEL_MIN
        ? 'home'
        : g.awayRecentForm - g.homeRecentForm >= RECENT_FORM_DUEL_MIN
          ? 'away'
          : null
      : null;

  const results = [wobaResult, sfrResult, bullpenResult, spFipResult, warResult, eloResult, formResult];
  const validCount = [
    g.homeLineupWoba != null && g.awayLineupWoba != null,
    g.homeSfr != null && g.awaySfr != null,
    g.homeBullpenFip != null && g.awayBullpenFip != null,
    g.homeSPFip != null && g.awaySPFip != null,
    g.homeWar != null && g.awayWar != null,
    g.homeElo !== undefined && g.awayElo !== undefined,
    g.homeRecentForm !== undefined && g.awayRecentForm !== undefined,
  ].filter(Boolean).length;

  if (validCount < COMPOSITE_DUEL_MIN_VALID) return null;
  const homeWins = results.filter((r) => r === 'home').length;
  const awayWins = results.filter((r) => r === 'away').length;
  if (homeWins < COMPOSITE_DUEL_THRESHOLD && awayWins < COMPOSITE_DUEL_THRESHOLD) return null;
  const favoredHome = homeWins >= COMPOSITE_DUEL_THRESHOLD;
  return { favoredHome, count: favoredHome ? homeWins : awayWins };
}

describe('wave-381 — 종합 우세 배지 최근폼 편입 (7팩터)', () => {
  it('RECENT_FORM_DUEL_MIN = 0.10 단일 소스 가드', () => {
    expect(RECENT_FORM_DUEL_MIN).toBe(0.10);
  });

  it('analysis/page.tsx: wave-381 최근폼 COMPOSITE 편입 callsite', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-381');
    expect(src).toContain('formResult');
    expect(src).toContain('g.homeRecentForm !== undefined && g.awayRecentForm !== undefined');
    expect(src).toContain('RECENT_FORM_DUEL_MIN');
  });

  it('analysis/page.tsx: COMPOSITE_DUEL results 배열에 formResult 포함', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('[wobaResult, sfrResult, bullpenResult, spFipResult, warResult, eloResult, formResult]');
  });

  it('최근폼 포함 홈 우세 7팩터 → 홈팀 7팩터 우세 배지', () => {
    const result = computeComposite({
      homeLineupWoba: 0.360, awayLineupWoba: 0.320,  // home (gap 0.040 >= 0.020)
      homeSfr: 15.0, awaySfr: 5.0,                   // home (gap 10 >= 5.0)
      homeBullpenFip: 3.0, awayBullpenFip: 4.5,      // home (away-home=1.5 >= 1.0)
      homeSPFip: 3.2, awaySPFip: 3.9,                // home (away-home=0.7 >= 0.5)
      homeWar: 30.0, awayWar: 20.0,                  // home (gap 10 >= 5.0)
      homeElo: 1550, awayElo: 1480,                  // home (gap 70 >= 50)
      homeRecentForm: 0.65, awayRecentForm: 0.45,    // home (gap 0.20 >= 0.10)
    });
    expect(result).not.toBeNull();
    expect(result!.favoredHome).toBe(true);
    expect(result!.count).toBe(7);
  });

  it('최근폼만 원정 우세 → 기존 홈 우세에서 카운트 감소', () => {
    const result = computeComposite({
      homeLineupWoba: 0.360, awayLineupWoba: 0.320,  // home
      homeSfr: 15.0, awaySfr: 5.0,                   // home
      homeBullpenFip: 3.0, awayBullpenFip: 4.5,      // home
      homeSPFip: 3.2, awaySPFip: 3.9,                // home
      homeWar: 30.0, awayWar: 20.0,                  // home
      homeElo: 1550, awayElo: 1480,                  // home
      homeRecentForm: 0.45, awayRecentForm: 0.65,    // away (gap 0.20 >= 0.10)
    });
    expect(result).not.toBeNull();
    expect(result!.favoredHome).toBe(true);
    expect(result!.count).toBe(6);
  });

  it('최근폼 갭 < RECENT_FORM_DUEL_MIN → 폼 tie (null)', () => {
    const result = computeComposite({
      homeLineupWoba: 0.360, awayLineupWoba: 0.320,  // home
      homeSfr: 15.0, awaySfr: 5.0,                   // home
      homeBullpenFip: 3.0, awayBullpenFip: 4.5,      // home
      homeSPFip: 3.2, awaySPFip: 3.9,                // home
      homeWar: 30.0, awayWar: 20.0,                  // home
      homeElo: 1550, awayElo: 1480,                  // home
      homeRecentForm: 0.52, awayRecentForm: 0.50,    // tie (gap 0.02 < 0.10)
    });
    expect(result).not.toBeNull();
    expect(result!.favoredHome).toBe(true);
    expect(result!.count).toBe(6);
  });

  it('폼 미제공 (undefined) → validCount에서 제외, 6팩터 기준 평가', () => {
    const result = computeComposite({
      homeLineupWoba: 0.360, awayLineupWoba: 0.320,  // home
      homeSfr: 15.0, awaySfr: 5.0,                   // home
      homeBullpenFip: 3.0, awayBullpenFip: 4.5,      // home
      homeSPFip: 3.2, awaySPFip: 3.9,                // home
      homeWar: 30.0, awayWar: 20.0,                  // home
      homeElo: 1550, awayElo: 1480,                  // home
      // homeRecentForm/awayRecentForm = undefined
    });
    expect(result).not.toBeNull();
    expect(result!.favoredHome).toBe(true);
    expect(result!.count).toBe(6);
  });

  it('validCount < COMPOSITE_DUEL_MIN_VALID(4) → 배지 미표시', () => {
    const result = computeComposite({
      homeLineupWoba: 0.360, awayLineupWoba: 0.320,
      homeSfr: 15.0, awaySfr: 5.0,
      homeBullpenFip: null, awayBullpenFip: null,
      homeSPFip: null, awaySPFip: null,
      homeWar: null, awayWar: null,
      // elo/form undefined
    });
    expect(result).toBeNull();
  });
});
