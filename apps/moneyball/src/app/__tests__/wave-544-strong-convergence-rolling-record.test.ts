import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_MIN_FACTORS, FACTOR_PICK_STRONG, COMPOSITE_DUEL_MIN_VALID } from '@moneyball/shared';

// wave-544: 강수렴 픽 rolling 성적 — getRecentConvergencePickRecord(limit, minFactors)
// convergenceRecord.ts 핵심 필터링 로직 — minFactors 파라미터 분기 + limit 동작 검증
//
// 호출 형태:
//   getRecentConvergencePickRecord(CONVERGENCE_RECORD_RECENT_LIMIT)              → 일반 수렴 (minFactors=7)
//   getRecentConvergencePickRecord(CONVERGENCE_RECORD_RECENT_LIMIT, FACTOR_PICK_STRONG) → 강수렴 (minFactors=8)
//
// 필터 조건:
//   1. duel.validCount >= COMPOSITE_DUEL_MIN_VALID (4)
//   2. Math.abs(duel.netScore) >= minFactors
//   3. homeScore !== null && awayScore !== null (경기 종료)
//   4. count < limit (최근 N경기)
//
// 결과: { wins, losses, total }

interface DuelRow {
  validCount: number;
  netScore: number;
}
interface GameRow {
  homeScore: number | null;
  awayScore: number | null;
  duel: DuelRow;
}

function computeRollingRecord(
  games: GameRow[],
  limit: number,
  minFactors: number,
): { wins: number; losses: number; total: number } {
  let wins = 0, losses = 0, count = 0;
  for (const row of games) {
    if (count >= limit) break;
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

describe('wave-544: 강수렴 픽 rolling 성적 — minFactors 파라미터 분기', () => {
  describe('minFactors=FACTOR_PICK_STRONG(8) 강수렴 필터', () => {
    it('netScore=7 (FACTOR_PICK_MIN_FACTORS) — 강수렴 제외', () => {
      const games: GameRow[] = [
        { homeScore: 5, awayScore: 2, duel: { validCount: VALID, netScore: FACTOR_PICK_MIN_FACTORS } },
      ];
      expect(computeRollingRecord(games, 10, FACTOR_PICK_STRONG)).toEqual({ wins: 0, losses: 0, total: 0 });
    });

    it('netScore=8 (FACTOR_PICK_STRONG) — 강수렴 포함, 홈 유리 홈 이김 → 1승', () => {
      const games: GameRow[] = [
        { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: FACTOR_PICK_STRONG } },
      ];
      expect(computeRollingRecord(games, 10, FACTOR_PICK_STRONG)).toEqual({ wins: 1, losses: 0, total: 1 });
    });

    it('netScore=-8 — 강수렴 포함, 원정 유리 원정 이김 → 1승', () => {
      const games: GameRow[] = [
        { homeScore: 1, awayScore: 4, duel: { validCount: VALID, netScore: -FACTOR_PICK_STRONG } },
      ];
      expect(computeRollingRecord(games, 10, FACTOR_PICK_STRONG)).toEqual({ wins: 1, losses: 0, total: 1 });
    });

    it('netScore=9, 홈 유리 홈 짐 → 1패', () => {
      const games: GameRow[] = [
        { homeScore: 1, awayScore: 3, duel: { validCount: VALID, netScore: 9 } },
      ];
      expect(computeRollingRecord(games, 10, FACTOR_PICK_STRONG)).toEqual({ wins: 0, losses: 1, total: 1 });
    });
  });

  describe('minFactors=FACTOR_PICK_MIN_FACTORS(7) 일반 수렴 필터', () => {
    it('netScore=7 — 일반 수렴 포함', () => {
      const games: GameRow[] = [
        { homeScore: 5, awayScore: 2, duel: { validCount: VALID, netScore: FACTOR_PICK_MIN_FACTORS } },
      ];
      expect(computeRollingRecord(games, 10, FACTOR_PICK_MIN_FACTORS)).toEqual({ wins: 1, losses: 0, total: 1 });
    });

    it('netScore=7 — 강수렴 제외 / 일반 수렴 포함 분기 차이', () => {
      const games: GameRow[] = [
        { homeScore: 4, awayScore: 1, duel: { validCount: VALID, netScore: 7 } },
        { homeScore: 1, awayScore: 3, duel: { validCount: VALID, netScore: 8 } },
      ];
      const strong = computeRollingRecord(games, 10, FACTOR_PICK_STRONG);
      const regular = computeRollingRecord(games, 10, FACTOR_PICK_MIN_FACTORS);
      // 강수렴: netScore=7 제외 → 1경기만 (netScore=8 홈유리 홈짐 → 1패)
      expect(strong).toEqual({ wins: 0, losses: 1, total: 1 });
      // 일반: netScore=7 포함 → 2경기 (홈유리 홈이김 → 1승, 홈유리 홈짐 → 1패)
      expect(regular).toEqual({ wins: 1, losses: 1, total: 2 });
    });
  });

  describe('limit 동작 — 최근 N경기 제한', () => {
    it('limit=2, 강수렴 5경기 — 첫 2경기만 집계', () => {
      const games: GameRow[] = [
        { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: 9 } },   // 홈 이김 → 승
        { homeScore: 1, awayScore: 4, duel: { validCount: VALID, netScore: -9 } },  // 원정 이김 → 승
        { homeScore: 0, awayScore: 2, duel: { validCount: VALID, netScore: 8 } },   // 홈 짐 → 패
        { homeScore: 5, awayScore: 0, duel: { validCount: VALID, netScore: 10 } },  // 제한 후 → 미집계
        { homeScore: 3, awayScore: 2, duel: { validCount: VALID, netScore: 8 } },   // 제한 후 → 미집계
      ];
      expect(computeRollingRecord(games, 2, FACTOR_PICK_STRONG)).toEqual({ wins: 2, losses: 0, total: 2 });
    });

    it('limit 안 비적격 경기는 limit 소모 X', () => {
      const games: GameRow[] = [
        { homeScore: 5, awayScore: 1, duel: { validCount: VALID, netScore: 7 } },  // minFactors=8 미만 → 스킵
        { homeScore: 3, awayScore: 1, duel: { validCount: VALID - 1, netScore: 9 } }, // validCount 부족 → 스킵
        { homeScore: null, awayScore: null, duel: { validCount: VALID, netScore: 9 } }, // 미종료 → 스킵
        { homeScore: 4, awayScore: 2, duel: { validCount: VALID, netScore: 8 } },  // 1번째 적격 → 승
        { homeScore: 1, awayScore: 3, duel: { validCount: VALID, netScore: 8 } },  // 2번째 적격 → limit=1 도달 → 미집계
      ];
      expect(computeRollingRecord(games, 1, FACTOR_PICK_STRONG)).toEqual({ wins: 1, losses: 0, total: 1 });
    });
  });

  describe('validCount guard', () => {
    it('validCount < COMPOSITE_DUEL_MIN_VALID(4) — 제외', () => {
      const games: GameRow[] = [
        { homeScore: 5, awayScore: 2, duel: { validCount: VALID - 1, netScore: 9 } },
      ];
      expect(computeRollingRecord(games, 10, FACTOR_PICK_STRONG)).toEqual({ wins: 0, losses: 0, total: 0 });
    });

    it('validCount === COMPOSITE_DUEL_MIN_VALID(4) — 경계 포함', () => {
      const games: GameRow[] = [
        { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: 8 } },
      ];
      expect(computeRollingRecord(games, 10, FACTOR_PICK_STRONG)).toEqual({ wins: 1, losses: 0, total: 1 });
    });
  });

  describe('total = wins + losses 불변', () => {
    it('복합 케이스 — total 정합', () => {
      const games: GameRow[] = [
        { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: 9 } },  // 홈유리 홈이김 → 승
        { homeScore: 1, awayScore: 3, duel: { validCount: VALID, netScore: 9 } },  // 홈유리 홈짐 → 패
        { homeScore: 1, awayScore: 4, duel: { validCount: VALID, netScore: -8 } }, // 원정유리 원정이김 → 승
        { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: -8 } }, // 원정유리 원정짐 → 패
      ];
      const result = computeRollingRecord(games, 10, FACTOR_PICK_STRONG);
      expect(result.total).toBe(result.wins + result.losses);
      expect(result).toEqual({ wins: 2, losses: 2, total: 4 });
    });
  });
});
