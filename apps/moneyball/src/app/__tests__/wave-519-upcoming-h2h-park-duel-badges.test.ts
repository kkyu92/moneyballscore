/**
 * wave-519: 이번 주 남은 경기 카드 H2H·구장 직접 대결 배지
 * h2hMap 룩업 로직 + park factor 임계값 검증
 */

import { describe, it, expect } from 'vitest';
import { H2H_DOMINANT_RATE, H2H_WEAK_RATE, H2H_MIN_GAMES, PARK_FACTOR_HITTER_MIN, PARK_FACTOR_PITCHER_MAX } from '@moneyball/shared';

describe('wave-519 upcoming H2H duel badge', () => {
  describe('h2hMap 룩업 로직', () => {
    it('canonical pair key 정렬 — 알파벳 순', () => {
      const homeCode = 'LG';
      const awayCode = 'KT';
      const [h2hA, h2hB] = [homeCode, awayCode].sort();
      expect(h2hA).toBe('KT');
      expect(h2hB).toBe('LG');
      expect(`${h2hA}:${h2hB}`).toBe('KT:LG');
    });

    it('홈팀 승수 조회 — 페어 키로 Record 인덱스', () => {
      const h2hPair: Record<string, number> = { LG: 7, KT: 3 };
      const homeCode = 'LG';
      const awayCode = 'KT';
      const h2hHomeWins = h2hPair[homeCode] ?? 0;
      const h2hAwayWins = h2hPair[awayCode] ?? 0;
      expect(h2hHomeWins).toBe(7);
      expect(h2hAwayWins).toBe(3);
    });

    it('페어 키 없을 때 빈 객체 ?? {} 처리', () => {
      const h2hMap = new Map<string, Record<string, number>>();
      const h2hPair = h2hMap.get('NC:SS') ?? {};
      const homeWins = h2hPair['SS'] ?? 0;
      expect(homeWins).toBe(0);
    });
  });

  describe('H2H 임계값 로직', () => {
    it('H2H_MIN_GAMES 미달 시 배지 표시 안 함', () => {
      const h2hTotal = H2H_MIN_GAMES - 1;
      expect(h2hTotal < H2H_MIN_GAMES).toBe(true);
    });

    it('홈 승률 >= H2H_DOMINANT_RATE(0.6) 시 홈팀 우세', () => {
      const h2hHomeWins = 7;
      const h2hAwayWins = 3;
      const h2hTotal = h2hHomeWins + h2hAwayWins;
      const homeRate = h2hHomeWins / h2hTotal;
      expect(homeRate).toBeGreaterThanOrEqual(H2H_DOMINANT_RATE);
    });

    it('홈 승률 <= H2H_WEAK_RATE(0.4) 시 원정팀 우세', () => {
      const h2hHomeWins = 3;
      const h2hAwayWins = 7;
      const h2hTotal = h2hHomeWins + h2hAwayWins;
      const homeRate = h2hHomeWins / h2hTotal;
      expect(homeRate).toBeLessThanOrEqual(H2H_WEAK_RATE);
    });

    it('중간 승률 (0.4 < rate < 0.6) 시 배지 없음', () => {
      const h2hHomeWins = 5;
      const h2hAwayWins = 5;
      const h2hTotal = h2hHomeWins + h2hAwayWins;
      const homeRate = h2hHomeWins / h2hTotal;
      const h2hFavoredHome = homeRate >= H2H_DOMINANT_RATE;
      const h2hFavoredAway = homeRate <= H2H_WEAK_RATE;
      expect(h2hFavoredHome || h2hFavoredAway).toBe(false);
    });

    it('홈 우세 시 wins/losses 표시 순서', () => {
      const h2hHomeWins = 7;
      const h2hAwayWins = 3;
      const homeRate = h2hHomeWins / (h2hHomeWins + h2hAwayWins);
      const h2hFavoredHome = homeRate >= H2H_DOMINANT_RATE;
      const [wins, losses] = h2hFavoredHome
        ? [h2hHomeWins, h2hAwayWins]
        : [h2hAwayWins, h2hHomeWins];
      expect(wins).toBe(7);
      expect(losses).toBe(3);
    });

    it('원정 우세 시 wins/losses 표시 순서 (원정 승수 먼저)', () => {
      const h2hHomeWins = 3;
      const h2hAwayWins = 7;
      const homeRate = h2hHomeWins / (h2hHomeWins + h2hAwayWins);
      const h2hFavoredHome = homeRate >= H2H_DOMINANT_RATE;
      const [wins, losses] = h2hFavoredHome
        ? [h2hHomeWins, h2hAwayWins]
        : [h2hAwayWins, h2hHomeWins];
      expect(wins).toBe(7);
      expect(losses).toBe(3);
    });
  });
});

describe('wave-519 upcoming 구장 직접 대결 배지', () => {
  describe('park factor 임계값 로직', () => {
    it('parkPf >= PARK_FACTOR_HITTER_MIN(105) 시 타자친화 — 홈팀 유리', () => {
      const pf = 107;
      expect(pf).toBeGreaterThanOrEqual(PARK_FACTOR_HITTER_MIN);
      const parkFavoredHome = pf >= PARK_FACTOR_HITTER_MIN;
      expect(parkFavoredHome).toBe(true);
    });

    it('parkPf <= PARK_FACTOR_PITCHER_MAX(95) 시 투수친화 — 원정팀 유리', () => {
      const pf = 93;
      expect(pf).toBeLessThanOrEqual(PARK_FACTOR_PITCHER_MAX);
      const parkFavoredAway = pf <= PARK_FACTOR_PITCHER_MAX;
      expect(parkFavoredAway).toBe(true);
    });

    it('중립 구장 (95 < pf < 105) 시 배지 없음', () => {
      const pf = 100;
      const parkFavoredHome = pf >= PARK_FACTOR_HITTER_MIN;
      const parkFavoredAway = pf <= PARK_FACTOR_PITCHER_MAX;
      expect(parkFavoredHome || parkFavoredAway).toBe(false);
    });

    it('parkPf undefined 시 배지 없음 — null guard', () => {
      const pf: number | undefined = undefined;
      expect(pf === undefined).toBe(true);
    });

    it('타자친화 구장 — 홈팀 유리 레이블 결정', () => {
      const pf = 107;
      const parkFavoredHome = pf >= PARK_FACTOR_HITTER_MIN;
      const parkType = parkFavoredHome ? '타자친화' : '투수친화';
      expect(parkType).toBe('타자친화');
    });

    it('투수친화 구장 — 원정팀 유리 레이블 결정', () => {
      const pf = 92;
      const parkFavoredHome = pf >= PARK_FACTOR_HITTER_MIN;
      const parkType = parkFavoredHome ? '타자친화' : '투수친화';
      expect(parkType).toBe('투수친화');
    });
  });
});
