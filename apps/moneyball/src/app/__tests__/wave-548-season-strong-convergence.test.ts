import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_STRONG, COMPOSITE_DUEL_MIN_VALID, KBO_SEASON_START_DATE } from '@moneyball/shared';

// wave-548: 이번 시즌 강수렴 픽 성적 — KBO_SEASON_START_DATE 기준 전체 집계
//
// 호출 형태:
//   getRecentConvergencePickRecord(CONVERGENCE_RECORD_RECENT_LIMIT, FACTOR_PICK_STRONG, KBO_SEASON_START_DATE)
//     → 시즌 전체 강수렴 픽 성적 (limit 무시)
//
// 불변:
//   KBO_SEASON_START_DATE = `${KBO_SEASON_YEAR}-04-01` (KBO_SEASON_YEAR 파생, 시즌 단일 source)
//   startDate 있음 → effectiveLimit = Number.MAX_SAFE_INTEGER (시즌 전체 집계)
//   UI: total > 0 시 "시즌 {wins}승{losses}패 ({pct}%)" — gray-300/gray-600 (이달보다 연함)

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

describe('wave-548: KBO_SEASON_START_DATE 상수', () => {
  it('KBO_SEASON_START_DATE = "2026-04-01" (KBO_SEASON_YEAR 파생)', () => {
    expect(KBO_SEASON_START_DATE).toBe('2026-04-01');
  });

  it('KBO_SEASON_START_DATE 형식 — yyyy-MM-dd', () => {
    expect(KBO_SEASON_START_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('wave-548: 시즌 강수렴 픽 성적 — startDate=KBO_SEASON_START_DATE 전체 집계', () => {
  it('limit=2 무시 — 강수렴 7경기 전부 집계', () => {
    const games: GameRow[] = [
      { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: 9 } },
      { homeScore: 1, awayScore: 4, duel: { validCount: VALID, netScore: -9 } },
      { homeScore: 1, awayScore: 3, duel: { validCount: VALID, netScore: 8 } },
      { homeScore: 5, awayScore: 0, duel: { validCount: VALID, netScore: 10 } },
      { homeScore: 3, awayScore: 2, duel: { validCount: VALID, netScore: 8 } },
      { homeScore: 2, awayScore: 4, duel: { validCount: VALID, netScore: -8 } },
      { homeScore: 6, awayScore: 1, duel: { validCount: VALID, netScore: 10 } },
    ];
    const result = computeRecord(games, 2, FACTOR_PICK_STRONG, KBO_SEASON_START_DATE);
    expect(result.total).toBe(7);
  });

  it('비적격 경기 필터링 — validCount 부족 / minFactors 미만 / 미종료 스킵', () => {
    const games: GameRow[] = [
      { homeScore: 5, awayScore: 1, duel: { validCount: VALID, netScore: 7 } },       // minFactors(8) 미만 → 스킵
      { homeScore: 3, awayScore: 1, duel: { validCount: VALID - 1, netScore: 9 } },   // validCount 부족 → 스킵
      { homeScore: null, awayScore: null, duel: { validCount: VALID, netScore: 9 } }, // 미종료 → 스킵
      { homeScore: 4, awayScore: 2, duel: { validCount: VALID, netScore: 8 } },       // 홈유리 홈이김 → 승
      { homeScore: 1, awayScore: 3, duel: { validCount: VALID, netScore: 8 } },       // 홈유리 홈짐 → 패
    ];
    expect(computeRecord(games, 100, FACTOR_PICK_STRONG, KBO_SEASON_START_DATE)).toEqual({
      wins: 1,
      losses: 1,
      total: 2,
    });
  });

  it('total = 0 → UI 배지 미표시 조건', () => {
    expect(computeRecord([], 10, FACTOR_PICK_STRONG, KBO_SEASON_START_DATE)).toEqual({
      wins: 0,
      losses: 0,
      total: 0,
    });
  });

  it('시즌 전체 승률 계산 — Math.round 100% 기준', () => {
    const games: GameRow[] = [
      { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: 9 } },
      { homeScore: 1, awayScore: 3, duel: { validCount: VALID, netScore: 9 } },
      { homeScore: 1, awayScore: 4, duel: { validCount: VALID, netScore: -8 } },
    ];
    const result = computeRecord(games, 100, FACTOR_PICK_STRONG, KBO_SEASON_START_DATE);
    expect(result).toEqual({ wins: 2, losses: 1, total: 3 });
    // UI: Math.round(2/3*100) = 67%
    expect(Math.round(result.wins / result.total * 100)).toBe(67);
  });

  it('total = wins + losses 불변', () => {
    const games: GameRow[] = [
      { homeScore: 3, awayScore: 1, duel: { validCount: VALID, netScore: 9 } },
      { homeScore: 1, awayScore: 4, duel: { validCount: VALID, netScore: -9 } },
      { homeScore: 1, awayScore: 3, duel: { validCount: VALID, netScore: 8 } },
      { homeScore: 5, awayScore: 0, duel: { validCount: VALID, netScore: 10 } },
    ];
    const result = computeRecord(games, 100, FACTOR_PICK_STRONG, KBO_SEASON_START_DATE);
    expect(result.total).toBe(result.wins + result.losses);
  });

  it('동점 경기 — favWon=false → losses (tie-game is 패)', () => {
    const games: GameRow[] = [
      { homeScore: 3, awayScore: 3, duel: { validCount: VALID, netScore: 9 } }, // 동점 → losses
      { homeScore: 4, awayScore: 2, duel: { validCount: VALID, netScore: 8 } }, // 홈이김 → wins
    ];
    const result = computeRecord(games, 100, FACTOR_PICK_STRONG, KBO_SEASON_START_DATE);
    expect(result).toEqual({ wins: 1, losses: 1, total: 2 });
  });
});
