import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FACTOR_PICK_MIN_FACTORS } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

type MockGame = {
  gameId: string;
  compositeDuelScore: number | null;
  compositeDuelHomeWins: number | null;
  compositeDuelAwayWins: number | null;
};

/** wave-392 factorPickGames 선택 로직 재현 */
function selectFactorPickGames(games: MockGame[]): MockGame[] {
  return [...games]
    .filter((g) => g.compositeDuelScore !== null && Math.abs(g.compositeDuelScore) >= FACTOR_PICK_MIN_FACTORS)
    .sort((a, b) => Math.abs(b.compositeDuelScore!) - Math.abs(a.compositeDuelScore!))
    .slice(0, 3);
}

/** wave-392 비율 문자열 재현 */
function buildRatio(pick: MockGame): string {
  const favoredHome = pick.compositeDuelScore! > 0;
  const hw = pick.compositeDuelHomeWins!;
  const aw = pick.compositeDuelAwayWins!;
  return favoredHome ? `${hw}:${aw}` : `${aw}:${hw}`;
}

describe('wave-392 — 팩터 수렴 픽 복수 표시 + 비율 (cycle 1736)', () => {
  it('FACTOR_PICK_MIN_FACTORS = 7', () => {
    expect(FACTOR_PICK_MIN_FACTORS).toBe(7);
  });

  it('analysis page 소스에 factorPickGames 변수명 박제', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    expect(src).toContain('factorPickGames');
  });

  it('analysis page 소스에 .slice(0, 3) 박제', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    expect(src).toContain('.slice(0, 3)');
  });

  it('analysis page 소스에 복수 경기 count 표시 박제', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    expect(src).toContain('경기)');
  });

  it('단일 수렴 경기 — 1건 반환', () => {
    const games: MockGame[] = [
      { gameId: 'g1', compositeDuelScore: 8, compositeDuelHomeWins: 8, compositeDuelAwayWins: 2 },
      { gameId: 'g2', compositeDuelScore: 3, compositeDuelHomeWins: 6, compositeDuelAwayWins: 3 },
    ];
    const result = selectFactorPickGames(games);
    expect(result).toHaveLength(1);
    expect(result[0].gameId).toBe('g1');
  });

  it('수렴 경기 2건 — 2건 반환, |netScore| 내림차순', () => {
    const games: MockGame[] = [
      { gameId: 'g1', compositeDuelScore: 7, compositeDuelHomeWins: 7, compositeDuelAwayWins: 3 },
      { gameId: 'g2', compositeDuelScore: -8, compositeDuelHomeWins: 1, compositeDuelAwayWins: 9 },
      { gameId: 'g3', compositeDuelScore: 2, compositeDuelHomeWins: 6, compositeDuelAwayWins: 4 },
    ];
    const result = selectFactorPickGames(games);
    expect(result).toHaveLength(2);
    expect(result[0].gameId).toBe('g2');
    expect(result[1].gameId).toBe('g1');
  });

  it('수렴 경기 4건 — 3건만 반환 (top 3 cap)', () => {
    const games: MockGame[] = [
      { gameId: 'g1', compositeDuelScore: 10, compositeDuelHomeWins: 10, compositeDuelAwayWins: 0 },
      { gameId: 'g2', compositeDuelScore: -9, compositeDuelHomeWins: 0, compositeDuelAwayWins: 9 },
      { gameId: 'g3', compositeDuelScore: 8, compositeDuelHomeWins: 8, compositeDuelAwayWins: 2 },
      { gameId: 'g4', compositeDuelScore: -7, compositeDuelHomeWins: 1, compositeDuelAwayWins: 8 },
    ];
    const result = selectFactorPickGames(games);
    expect(result).toHaveLength(3);
    expect(result.map(g => g.gameId)).toEqual(['g1', 'g2', 'g3']);
  });

  it('수렴 경기 0건 — 빈 배열 반환', () => {
    const games: MockGame[] = [
      { gameId: 'g1', compositeDuelScore: 5, compositeDuelHomeWins: 5, compositeDuelAwayWins: 5 },
      { gameId: 'g2', compositeDuelScore: null, compositeDuelHomeWins: null, compositeDuelAwayWins: null },
    ];
    const result = selectFactorPickGames(games);
    expect(result).toHaveLength(0);
  });

  it('비율: 홈 우세 → hw:aw (홈 앞)', () => {
    const pick: MockGame = {
      gameId: 'g1',
      compositeDuelScore: 7,
      compositeDuelHomeWins: 8,
      compositeDuelAwayWins: 2,
    };
    expect(buildRatio(pick)).toBe('8:2');
  });

  it('비율: 원정 우세 → aw:hw (원정 앞)', () => {
    const pick: MockGame = {
      gameId: 'g1',
      compositeDuelScore: -7,
      compositeDuelHomeWins: 1,
      compositeDuelAwayWins: 8,
    };
    expect(buildRatio(pick)).toBe('8:1');
  });

  it('비율: 동점(netScore=0) → 홈 비율 (0:0)', () => {
    const pick: MockGame = {
      gameId: 'g1',
      compositeDuelScore: 0,
      compositeDuelHomeWins: 0,
      compositeDuelAwayWins: 0,
    };
    expect(buildRatio(pick)).toBe('0:0');
  });
});
