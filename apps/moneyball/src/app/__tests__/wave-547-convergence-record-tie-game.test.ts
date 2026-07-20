import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_STRONG, COMPOSITE_DUEL_MIN_VALID } from '@moneyball/shared';

// wave-547: convergenceRecord tie-game 처리 guard
// KBO 연장전 동점 종료(무승부) 시 동작 문서화.
//
// 현재 동작:
//   동점(homeScore === awayScore) → favWon = false → losses++ 처리
//   "예측한 팀이 이기지 못함" = 예측 실패로 카운트.
//
// rolling/monthly 양쪽 동일 로직 (effectiveLimit 분기만 다름).

interface DuelRow {
  validCount: number;
  netScore: number;
}
interface GameRow {
  homeScore: number | null;
  awayScore: number | null;
  duel: DuelRow;
}

function computeRecord(
  games: GameRow[],
  limit: number,
  minFactors: number,
  startDate?: string,
): { wins: number; losses: number; total: number } {
  const effectiveLimit = startDate != null ? Number.MAX_SAFE_INTEGER : limit;
  let wins = 0, losses = 0, count = 0;
  for (const row of games) {
    if (count >= effectiveLimit) break;
    if (row.duel.validCount < COMPOSITE_DUEL_MIN_VALID) continue;
    if (Math.abs(row.duel.netScore) < minFactors) continue;
    if (row.homeScore === null || row.awayScore === null) continue;
    const favoredHome = row.duel.netScore > 0;
    const favWon = favoredHome ? row.homeScore > row.awayScore : row.awayScore > row.homeScore;
    if (favWon) wins++; else losses++;
    count++;
  }
  return { wins, losses, total: count };
}

const VALID = COMPOSITE_DUEL_MIN_VALID;

describe('wave-547: convergenceRecord tie-game 처리 — 동점 = losses 카운트', () => {
  describe('동점 경기 → 패배 카운트 (rolling 모드)', () => {
    it('홈 유리 강수렴 픽 + 동점(3-3) → 패 1', () => {
      const games: GameRow[] = [
        { homeScore: 3, awayScore: 3, duel: { validCount: VALID, netScore: 9 } },
      ];
      expect(computeRecord(games, 10, FACTOR_PICK_STRONG)).toEqual({ wins: 0, losses: 1, total: 1 });
    });

    it('원정 유리 강수렴 픽 + 동점(1-1) → 패 1', () => {
      const games: GameRow[] = [
        { homeScore: 1, awayScore: 1, duel: { validCount: VALID, netScore: -9 } },
      ];
      expect(computeRecord(games, 10, FACTOR_PICK_STRONG)).toEqual({ wins: 0, losses: 1, total: 1 });
    });

    it('정상 승 + 동점 + 정상 패 혼합 → total 정합', () => {
      const games: GameRow[] = [
        { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: 9 } },   // 홈 유리 홈 이김 → 승
        { homeScore: 2, awayScore: 2, duel: { validCount: VALID, netScore: 9 } },   // 홈 유리 동점 → 패
        { homeScore: 1, awayScore: 3, duel: { validCount: VALID, netScore: 9 } },   // 홈 유리 홈 짐 → 패
      ];
      const result = computeRecord(games, 10, FACTOR_PICK_STRONG);
      expect(result).toEqual({ wins: 1, losses: 2, total: 3 });
      expect(result.total).toBe(result.wins + result.losses);
    });
  });

  describe('동점 경기 → 패배 카운트 (monthly 모드 — startDate 지정)', () => {
    it('startDate 지정 + 동점 경기 → 패 카운트, limit 무시 전체 집계', () => {
      const games: GameRow[] = [
        { homeScore: 2, awayScore: 2, duel: { validCount: VALID, netScore: 8 } },   // 동점 → 패
        { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: 8 } },   // 승
        { homeScore: 0, awayScore: 0, duel: { validCount: VALID, netScore: -8 } },  // 동점 → 패
      ];
      expect(computeRecord(games, 1, FACTOR_PICK_STRONG, '2026-07-01')).toEqual({
        wins: 1, losses: 2, total: 3,
      });
    });

    it('startDate 지정 + 전체 동점 → wins=0, losses=N', () => {
      const games: GameRow[] = [
        { homeScore: 1, awayScore: 1, duel: { validCount: VALID, netScore: 9 } },
        { homeScore: 2, awayScore: 2, duel: { validCount: VALID, netScore: -9 } },
      ];
      const result = computeRecord(games, 1, FACTOR_PICK_STRONG, '2026-07-01');
      expect(result).toEqual({ wins: 0, losses: 2, total: 2 });
      expect(result.total).toBe(result.wins + result.losses);
    });
  });

  describe('비적격 경기 — total=0 (monthly 모드)', () => {
    it('startDate 지정 + 강수렴 없음(netScore<8) → total=0', () => {
      const games: GameRow[] = [
        { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: 7 } },  // minFactors 미달
        { homeScore: 1, awayScore: 3, duel: { validCount: VALID, netScore: 7 } },  // minFactors 미달
      ];
      expect(computeRecord(games, 1, FACTOR_PICK_STRONG, '2026-07-01')).toEqual({
        wins: 0, losses: 0, total: 0,
      });
    });

    it('startDate 지정 + 경기 없음(빈 배열) → total=0', () => {
      expect(computeRecord([], 10, FACTOR_PICK_STRONG, '2026-07-01')).toEqual({
        wins: 0, losses: 0, total: 0,
      });
    });
  });
});
