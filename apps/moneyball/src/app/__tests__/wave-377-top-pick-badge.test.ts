import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  classifyWinnerProb,
  winnerProbOf,
  WINNER_PROB_CONFIDENT,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('wave-377 — 오늘의 탑픽 배지 (cycle 1719)', () => {
  it('WINNER_PROB_CONFIDENT = 0.65', () => {
    expect(WINNER_PROB_CONFIDENT).toBe(0.65);
  });

  it('classifyWinnerProb(0.7) = confident → 탑픽 후보', () => {
    expect(classifyWinnerProb(0.7)).toBe('confident');
  });

  it('classifyWinnerProb(0.3) = confident → 탑픽 후보 (winnerProb=0.7)', () => {
    expect(classifyWinnerProb(0.3)).toBe('confident');
    expect(winnerProbOf(0.3)).toBeCloseTo(0.7, 5);
  });

  it('classifyWinnerProb(0.6) = lean → 탑픽 후보 아님', () => {
    expect(classifyWinnerProb(0.6)).toBe('lean');
  });

  it('classifyWinnerProb(0.5) = tossup → 탑픽 후보 아님', () => {
    expect(classifyWinnerProb(0.5)).toBe('tossup');
  });

  it('winnerProbOf sorts correctly: 0.3→0.7 > 0.35→0.65 > 0.4→0.6', () => {
    expect(winnerProbOf(0.3)).toBeGreaterThan(winnerProbOf(0.35));
    expect(winnerProbOf(0.35)).toBeGreaterThan(winnerProbOf(0.4));
  });

  it('탑픽 선택 로직: confident 중 최고 winnerProb 게임', () => {
    const games = [
      { gameId: 1, homeWinProb: 0.62 }, // lean
      { gameId: 2, homeWinProb: 0.67 }, // confident
      { gameId: 3, homeWinProb: 0.72 }, // confident, highest
    ];
    const bestPickGameId = [...games]
      .sort((a, b) => winnerProbOf(b.homeWinProb) - winnerProbOf(a.homeWinProb))
      .find((g) => classifyWinnerProb(g.homeWinProb) === 'confident')
      ?.gameId ?? null;
    expect(bestPickGameId).toBe(3);
  });

  it('탑픽 없음: 전체 lean/tossup → bestPickGameId = null', () => {
    const games = [
      { gameId: 1, homeWinProb: 0.62 },
      { gameId: 2, homeWinProb: 0.55 },
    ];
    const bestPickGameId = [...games]
      .sort((a, b) => winnerProbOf(b.homeWinProb) - winnerProbOf(a.homeWinProb))
      .find((g) => classifyWinnerProb(g.homeWinProb) === 'confident')
      ?.gameId ?? null;
    expect(bestPickGameId).toBeNull();
  });

  it('탑픽 단일: confident 1개만 있을 때 그 게임', () => {
    const games = [
      { gameId: 1, homeWinProb: 0.55 }, // lean
      { gameId: 2, homeWinProb: 0.66 }, // confident
      { gameId: 3, homeWinProb: 0.58 }, // lean
    ];
    const bestPickGameId = [...games]
      .sort((a, b) => winnerProbOf(b.homeWinProb) - winnerProbOf(a.homeWinProb))
      .find((g) => classifyWinnerProb(g.homeWinProb) === 'confident')
      ?.gameId ?? null;
    expect(bestPickGameId).toBe(2);
  });

  it('analysis/page.tsx: wave-377 badge 존재', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-377');
    expect(src).toContain('탑픽');
    expect(src).toContain('bestPickGameId');
    expect(src).toContain('isTopPick');
  });

  it('analysis/page.tsx: 인라인 0.65 사용 X (단일 source 유지)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).not.toMatch(/=== 0\.65\b/);
    expect(src).not.toMatch(/>= 0\.65\b/);
  });
});
