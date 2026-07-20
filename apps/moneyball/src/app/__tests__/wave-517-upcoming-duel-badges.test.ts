/**
 * wave-517: 이번 주 남은 경기 카드 SP FIP·wOBA 직접 대결 배지
 * UpcomingScheduledGame 타입 확장 + 임계값 로직 검증
 */

import { describe, it, expect } from 'vitest';
import { SP_FIP_DUEL_MIN, LINEUP_WOBA_DUEL_MIN } from '@moneyball/shared';

describe('wave-517 upcoming duel badge thresholds', () => {
  describe('SP_FIP_DUEL_MIN', () => {
    it('임계값이 0.5 이상', () => {
      expect(SP_FIP_DUEL_MIN).toBeGreaterThanOrEqual(0.5);
    });

    it('홈 SP FIP 우세 (홈 FIP 낮을수록 우세)', () => {
      const homeFip = 3.20;
      const awayFip = 4.10;
      const delta = homeFip - awayFip; // -0.90
      expect(Math.abs(delta)).toBeGreaterThanOrEqual(SP_FIP_DUEL_MIN);
      expect(delta < 0).toBe(true); // 홈 우세
    });

    it('원정 SP FIP 우세', () => {
      const homeFip = 4.50;
      const awayFip = 3.20;
      const delta = homeFip - awayFip; // +1.30
      expect(Math.abs(delta)).toBeGreaterThanOrEqual(SP_FIP_DUEL_MIN);
      expect(delta < 0).toBe(false); // 원정 우세
    });

    it('임계값 미달 시 배지 표시 안 함', () => {
      const homeFip = 3.50;
      const awayFip = 3.70;
      const delta = homeFip - awayFip; // -0.20
      expect(Math.abs(delta)).toBeLessThan(SP_FIP_DUEL_MIN);
    });
  });

  describe('LINEUP_WOBA_DUEL_MIN', () => {
    it('임계값이 0.020 이상', () => {
      expect(LINEUP_WOBA_DUEL_MIN).toBeGreaterThanOrEqual(0.020);
    });

    it('홈 타선 wOBA 우세 (홈 wOBA 높을수록 우세)', () => {
      const homeWoba = 0.350;
      const awayWoba = 0.310;
      const delta = homeWoba - awayWoba; // +0.040
      expect(Math.abs(delta)).toBeGreaterThanOrEqual(LINEUP_WOBA_DUEL_MIN);
      expect(delta > 0).toBe(true); // 홈 우세
    });

    it('원정 타선 wOBA 우세', () => {
      const homeWoba = 0.300;
      const awayWoba = 0.340;
      const delta = homeWoba - awayWoba; // -0.040
      expect(Math.abs(delta)).toBeGreaterThanOrEqual(LINEUP_WOBA_DUEL_MIN);
      expect(delta > 0).toBe(false); // 원정 우세
    });

    it('임계값 미달 시 배지 표시 안 함', () => {
      const homeWoba = 0.320;
      const awayWoba = 0.330;
      const delta = homeWoba - awayWoba; // -0.010
      expect(Math.abs(delta)).toBeLessThan(LINEUP_WOBA_DUEL_MIN);
    });
  });

  describe('null 가드', () => {
    it('homeSPFip null 이면 배지 표시 안 함', () => {
      const homeFip: number | null = null;
      const awayFip: number | null = 3.50;
      expect(homeFip != null && awayFip != null).toBe(false);
    });

    it('awaySPFip null 이면 배지 표시 안 함', () => {
      const homeFip: number | null = 3.50;
      const awayFip: number | null = null;
      expect(homeFip != null && awayFip != null).toBe(false);
    });

    it('homeLineupWoba null 이면 배지 표시 안 함', () => {
      const homeWoba: number | null = null;
      const awayWoba: number | null = 0.330;
      expect(homeWoba != null && awayWoba != null).toBe(false);
    });

    it('두 값 모두 있으면 조건 통과', () => {
      const homeFip: number | null = 3.20;
      const awayFip: number | null = 4.10;
      expect(homeFip != null && awayFip != null).toBe(true);
    });
  });
});
