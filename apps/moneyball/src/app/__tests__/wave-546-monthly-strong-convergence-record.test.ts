import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_STRONG, COMPOSITE_DUEL_MIN_VALID } from '@moneyball/shared';

// wave-546: 강수렴 픽 이번 달 성적 — getRecentConvergencePickRecord(limit, minFactors, startDate)
// startDate 지정 시 effectiveLimit = Number.MAX_SAFE_INTEGER (limit 무시, 전체 집계)
//
// 호출 형태:
//   getRecentConvergencePickRecord(CONVERGENCE_RECORD_RECENT_LIMIT, FACTOR_PICK_STRONG, currentMonth.startDate)
//     → 이번 달 강수렴 픽 전체 성적 (limit 무시)
//
// 불변:
//   startDate 없음 → effectiveLimit = limit (기존 rolling 동작 유지)
//   startDate 있음 → effectiveLimit = Number.MAX_SAFE_INTEGER (월간 전체 집계)

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

describe('wave-546: 강수렴 픽 이번 달 성적 — startDate param effectiveLimit 분기', () => {
  describe('startDate 없음 → limit 적용 (기존 rolling 동작 유지)', () => {
    it('limit=2, 강수렴 5경기 — 2경기만 집계', () => {
      const games: GameRow[] = [
        { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: 9 } },
        { homeScore: 1, awayScore: 4, duel: { validCount: VALID, netScore: -9 } },
        { homeScore: 1, awayScore: 3, duel: { validCount: VALID, netScore: 8 } },
        { homeScore: 5, awayScore: 0, duel: { validCount: VALID, netScore: 10 } },
        { homeScore: 3, awayScore: 2, duel: { validCount: VALID, netScore: 8 } },
      ];
      expect(computeRecord(games, 2, FACTOR_PICK_STRONG)).toEqual({ wins: 2, losses: 0, total: 2 });
    });
  });

  describe('startDate 있음 → limit 무시 전체 집계 (월간 성적)', () => {
    it('startDate 지정 시 limit=2 무시 — 강수렴 5경기 전부 집계', () => {
      const games: GameRow[] = [
        { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: 9 } },   // 홈유리 홈이김 → 승
        { homeScore: 1, awayScore: 4, duel: { validCount: VALID, netScore: -9 } },  // 원정유리 원정이김 → 승
        { homeScore: 1, awayScore: 3, duel: { validCount: VALID, netScore: 8 } },   // 홈유리 홈짐 → 패
        { homeScore: 5, awayScore: 0, duel: { validCount: VALID, netScore: 10 } },  // 홈유리 홈이김 → 승
        { homeScore: 3, awayScore: 2, duel: { validCount: VALID, netScore: 8 } },   // 홈유리 홈이김 → 승
      ];
      expect(computeRecord(games, 2, FACTOR_PICK_STRONG, '2026-07-01')).toEqual({
        wins: 4,
        losses: 1,
        total: 5,
      });
    });

    it('startDate 지정 시 비적격 경기는 여전히 스킵', () => {
      const games: GameRow[] = [
        { homeScore: 5, awayScore: 1, duel: { validCount: VALID, netScore: 7 } },       // minFactors=8 미만 → 스킵
        { homeScore: 3, awayScore: 1, duel: { validCount: VALID - 1, netScore: 9 } },   // validCount 부족 → 스킵
        { homeScore: null, awayScore: null, duel: { validCount: VALID, netScore: 9 } }, // 미종료 → 스킵
        { homeScore: 4, awayScore: 2, duel: { validCount: VALID, netScore: 8 } },       // 적격 → 승
        { homeScore: 1, awayScore: 3, duel: { validCount: VALID, netScore: 8 } },       // 적격 → 패
      ];
      expect(computeRecord(games, 1, FACTOR_PICK_STRONG, '2026-07-01')).toEqual({
        wins: 1,
        losses: 1,
        total: 2,
      });
    });

    it('startDate=undefined vs 명시 undefined — limit 그대로 적용', () => {
      const games: GameRow[] = [
        { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: 9 } },
        { homeScore: 1, awayScore: 4, duel: { validCount: VALID, netScore: -9 } },
        { homeScore: 1, awayScore: 3, duel: { validCount: VALID, netScore: 8 } },
      ];
      expect(computeRecord(games, 2, FACTOR_PICK_STRONG, undefined)).toEqual({
        wins: 2,
        losses: 0,
        total: 2,
      });
    });
  });

  describe('total = wins + losses 불변', () => {
    it('월간 모드 복합 케이스 — total 정합', () => {
      const games: GameRow[] = [
        { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: 9 } },
        { homeScore: 1, awayScore: 3, duel: { validCount: VALID, netScore: 9 } },
        { homeScore: 1, awayScore: 4, duel: { validCount: VALID, netScore: -8 } },
        { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: -8 } },
        { homeScore: 2, awayScore: 0, duel: { validCount: VALID, netScore: 10 } },
      ];
      const result = computeRecord(games, 2, FACTOR_PICK_STRONG, '2026-07-01');
      expect(result.total).toBe(result.wins + result.losses);
      expect(result).toEqual({ wins: 3, losses: 2, total: 5 });
    });
  });
});
