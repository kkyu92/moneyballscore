import { describe, it, expect } from 'vitest';
import { COMPOSITE_DUEL_MIN_VALID, FACTOR_PICK_STRONG } from '@moneyball/shared';
import { computeCompositeDuel } from '@/lib/analysis/computeCompositeDuel';

// wave-551: 과거 경기(어제/이번 주 아카이브) H2H 제외 guard
// getYesterdayGames / getThisWeekPreviousGames 는 h2hHomeWins/h2hAwayWins 미전달.
// 사유: 과거 경기는 경기 시점 h2h 데이터 없음 + predictions 테이블 미포함.
// 예정 경기(getThisWeekRemainingGames / getTodayAnalysisData)만 h2hMap 에서 h2h 주입.
//
// computeCompositeDuel 동작:
//   h2hHomeWins/h2hAwayWins undefined → h2hResult = null, h2h valid = false
//   → validCount 최대 9 (H2H 제외된 10팩터 집계)
//   → netScore 최대 절대값 = 9 (9팩터 모두 홈 또는 원정 유리 + H2H 제외)
//
// SFR 값 스케일: SFR_DUEL_MIN = 5.0 (정수 단위, 예: homeSfr=35, awaySfr=20 → diff=15 OK)
//
// 불변 (주석 동기 wave-549 패턴):
//   getYesterdayGames  comment: "(ThisWeekPreviousGames 패턴 동일, H2H 제외)"  [wave-551 fix]
//   getThisWeekPreviousGames comment: "(H2H 제외)"                             [wave-405 기존]
//
// 팀 코드: SSG 랜더스 = SK (parkPf=105, 타자 친화)
//          한화 이글스 = HH (parkPf=101, 중립~약 타자)
//          NC 다이노스 = NC (parkPf=100, 중립)

describe('wave-551: 과거 경기 computeCompositeDuel H2H 제외 guard', () => {
  describe('H2H 필드 미전달 → h2h valid=false, validCount 최대 9', () => {
    it('h2hHomeWins/h2hAwayWins 미전달 → h2h 팩터 valid=false (validCount < 10)', () => {
      const withoutH2h = computeCompositeDuel({
        homeCode: 'LG',
        homeLineupWoba: 0.340,
        awayLineupWoba: 0.305,
        homeSfr: 35,
        awaySfr: 20,
        homeBullpenFip: 3.50,
        awayBullpenFip: 4.00,
        homeSPFip: 3.20,
        awaySPFip: 4.00,
        homeSPXfip: 3.30,
        awaySPXfip: 4.10,
        homeWar: 25,
        awayWar: 15,
        homeElo: 1550,
        awayElo: 1450,
        homeRecentForm: 7,
        awayRecentForm: 3,
        // h2hHomeWins/h2hAwayWins 미전달 → H2H valid=false
      });
      expect(withoutH2h.validCount).toBeLessThan(10);
    });

    it('h2hHomeWins/h2hAwayWins 전달 → h2h 팩터 valid=true (validCount+1)', () => {
      const base = {
        homeCode: 'LG' as const,
        homeLineupWoba: 0.340,
        awayLineupWoba: 0.305,
        homeSfr: 35,
        awaySfr: 20,
        homeBullpenFip: 3.50,
        awayBullpenFip: 4.00,
        homeSPFip: 3.20,
        awaySPFip: 4.00,
        homeSPXfip: 3.30,
        awaySPXfip: 4.10,
        homeWar: 25,
        awayWar: 15,
        homeElo: 1550,
        awayElo: 1450,
        homeRecentForm: 7,
        awayRecentForm: 3,
      };
      const withH2h = computeCompositeDuel({
        ...base,
        h2hHomeWins: 8,
        h2hAwayWins: 2,
      });
      const withoutH2h = computeCompositeDuel(base);
      // h2h 전달 시 validCount가 미전달보다 1 많음 (H2H valid=true)
      expect(withH2h.validCount).toBe(withoutH2h.validCount + 1);
    });
  });

  describe('H2H 제외 시 COMPOSITE_DUEL_MIN_VALID 도달 가능성', () => {
    it('4팩터 유효(wOBA/SFR/bullpenFIP/spFIP) + h2h 미전달 → COMPOSITE_DUEL_MIN_VALID 충족', () => {
      const result = computeCompositeDuel({
        homeCode: 'KT',
        homeLineupWoba: 0.340,
        awayLineupWoba: 0.305,  // wOBA diff=0.035 >= 0.020 → valid
        homeSfr: 35,
        awaySfr: 20,            // SFR diff=15 >= 5.0 → valid
        homeBullpenFip: 3.50,
        awayBullpenFip: 4.50,  // bullpenFIP diff=1.0 >= 1.0 → valid
        homeSPFip: 3.20,
        awaySPFip: 4.00,       // spFIP diff=0.8 >= 0.5 → valid
        // h2h/elo/form/xfip/war/park 일부 미전달
      });
      expect(result.validCount).toBeGreaterThanOrEqual(COMPOSITE_DUEL_MIN_VALID);
    });

    it('H2H 미전달 → validCount <= 9 (10팩터 중 H2H 1개 제외)', () => {
      // NC (창원, parkPf=100 중립) → park=null → validCount 최대 8
      const result = computeCompositeDuel({
        homeCode: 'NC',
        homeLineupWoba: 0.350,
        awayLineupWoba: 0.290,
        homeSfr: 35,
        awaySfr: 20,
        homeBullpenFip: 3.00,
        awayBullpenFip: 4.50,
        homeSPFip: 2.90,
        awaySPFip: 4.50,
        homeSPXfip: 3.00,
        awaySPXfip: 4.50,
        homeWar: 30,
        awayWar: 10,
        homeElo: 1600,
        awayElo: 1400,
        homeRecentForm: 9,
        awayRecentForm: 1,
        // h2h 미전달 → H2H valid=false
      });
      // H2H 제외 → validCount <= 9
      expect(result.validCount).toBeLessThanOrEqual(9);
    });
  });

  describe('과거 경기 배지 조건 — H2H 제외 최대 validCount=9', () => {
    it('H2H 미전달 → |netScore| <= 9 (H2H 없이 최대 9팩터 유효)', () => {
      // SK(SSG, parkPf=105 타자 친화) + 8 non-h2h 팩터 홈 유리 + park 홈 유리
      // → validCount=9 (park 포함), netScore=9
      const result = computeCompositeDuel({
        homeCode: 'SK',  // SSG 랜더스 (인천, parkPf=105 >= 105 → park=home)
        homeLineupWoba: 0.350,
        awayLineupWoba: 0.310,
        homeSfr: 35,
        awaySfr: 20,
        homeBullpenFip: 3.00,
        awayBullpenFip: 4.50,
        homeSPFip: 2.90,
        awaySPFip: 4.50,
        homeSPXfip: 3.00,
        awaySPXfip: 4.50,
        homeWar: 30,
        awayWar: 10,
        homeElo: 1600,
        awayElo: 1400,
        homeRecentForm: 9,
        awayRecentForm: 1,
        // h2h 미전달 → H2H 제외
      });
      // H2H 없이 최대 9팩터 → |netScore| <= 9
      expect(Math.abs(result.netScore)).toBeLessThanOrEqual(9);
    });

    it('8팩터 홈 유리 + h2h 미전달 → netScore >= FACTOR_PICK_STRONG(8)', () => {
      // HH(한화, parkPf=101, 105 미만 → park=null)
      // → 8팩터(wOBA/SFR/bullpenFIP/spFIP/xFIP/WAR/Elo/폼) 홈 유리, validCount=8
      const result = computeCompositeDuel({
        homeCode: 'HH',
        homeLineupWoba: 0.350,
        awayLineupWoba: 0.310,  // wOBA diff=0.040 >= 0.020 → home
        homeSfr: 35,
        awaySfr: 20,             // SFR diff=15 >= 5.0 → home
        homeBullpenFip: 3.00,
        awayBullpenFip: 4.50,   // bullpenFIP diff=1.5 >= 1.0 → home
        homeSPFip: 2.90,
        awaySPFip: 4.50,        // spFIP diff=1.6 >= 0.5 → home
        homeSPXfip: 3.00,
        awaySPXfip: 4.50,       // xFIP diff=1.5 >= 0.5 → home
        homeWar: 30,
        awayWar: 10,            // WAR diff=20 >= WAR_DUEL_MIN=5.0 → home
        homeElo: 1600,
        awayElo: 1400,          // Elo diff=200 >= ELO_GAP_STRONG=50 → home
        homeRecentForm: 9,
        awayRecentForm: 1,      // 폼 diff=8 >= RECENT_FORM_DUEL_MIN=0.10 → home
        // h2h 미전달 → 과거 경기 패턴
        // park: HH parkPf=101 < 105 → park=null → validCount=8, netScore=8
      });
      if (result.validCount >= COMPOSITE_DUEL_MIN_VALID) {
        // 8팩터 전부 홈 유리 → netScore = 8 >= FACTOR_PICK_STRONG(8)
        expect(result.netScore).toBeGreaterThanOrEqual(FACTOR_PICK_STRONG);
      }
    });
  });
});
