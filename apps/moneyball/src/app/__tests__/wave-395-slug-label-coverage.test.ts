import { describe, it, expect } from 'vitest';
import { computeCompositeDuel } from '@/lib/analysis/computeCompositeDuel';
import { FACTOR_LABELS } from '@/lib/predictions/factorLabels';

// wave-395: computeCompositeDuel slug → FACTOR_LABELS 완전 커버리지 가드
// analysis/page.tsx line 975: favoredSlugs.map(s => FACTOR_LABELS[s]).filter(Boolean)
// FACTOR_LABELS에 없는 slug는 .filter(Boolean)로 silent drop됨.
// 10팩터 모두 홈 우세 케이스로 최대 slug 집합 생성 → FACTOR_LABELS 완전 포함 여부 검증.
describe('wave-395: computeCompositeDuel slug → FACTOR_LABELS 커버리지', () => {
  const allHomeResult = computeCompositeDuel({
    homeCode: 'SS',            // park_factor: parkPf=108 >= PARK_FACTOR_HITTER_MIN(105) → home
    homeLineupWoba: 0.380, awayLineupWoba: 0.280,  // diff=0.10 >= LINEUP_WOBA_DUEL_MIN(0.020) → home
    homeSfr: 50, awaySfr: 20,                       // diff=30 >= SFR_DUEL_MIN(5.0) → home
    homeBullpenFip: 3.0, awayBullpenFip: 5.0,       // away−home=2.0 >= BULLPEN_FIP_DIFF_MIN(1.0) → home
    homeSPFip: 2.5, awaySPFip: 4.0,                 // away−home=1.5 >= SP_FIP_DUEL_MIN(0.5) → home
    homeWar: 40, awayWar: 5,                         // diff=35 >= WAR_DUEL_MIN(5.0) → home
    homeElo: 1600, awayElo: 1400,                    // diff=200 >= ELO_GAP_STRONG(50) → home
    homeRecentForm: 0.9, awayRecentForm: 0.1,        // diff=0.8 >= RECENT_FORM_DUEL_MIN(0.10) → home
    h2hHomeWins: 10, h2hAwayWins: 2,                 // homeRate=0.833 >= H2H_DOMINANT_RATE(0.6) → home
    homeSPXfip: 2.5, awaySPXfip: 4.0,               // away−home=1.5 >= SP_XFIP_DUEL_MIN(0.5) → home
  });

  it('10팩터 모두 홈 우세 — slug 배열 최대 집합 생성', () => {
    expect(allHomeResult.homeWins).toBe(10);
    expect(allHomeResult.awayWins).toBe(0);
    expect(allHomeResult.homeFavoredSlugs).toHaveLength(10);
  });

  it('homeFavoredSlugs 모두 FACTOR_LABELS에 존재 (silent drop 0개)', () => {
    const missing = allHomeResult.homeFavoredSlugs.filter((s) => !(s in FACTOR_LABELS));
    expect(missing).toEqual([]);
  });

  it('filter(Boolean) 전후 길이 동일 — silent drop 없음', () => {
    const mapped = allHomeResult.homeFavoredSlugs.map((s) => FACTOR_LABELS[s]).filter(Boolean);
    expect(mapped).toHaveLength(allHomeResult.homeFavoredSlugs.length);
  });

  it('FACTOR_LABELS 10개 키 모두 computeCompositeDuel slug 집합과 일치', () => {
    const labelKeys = new Set(Object.keys(FACTOR_LABELS));
    const duelSlugs = new Set(allHomeResult.homeFavoredSlugs);
    expect(duelSlugs).toEqual(labelKeys);
  });
});
