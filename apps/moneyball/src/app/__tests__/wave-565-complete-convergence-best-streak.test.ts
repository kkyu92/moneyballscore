import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { computeConvergenceBestStreak } from '@/lib/analysis/convergenceRecord';
import { FACTOR_PICK_COMPLETE, FACTOR_PICK_STRONG } from '@moneyball/shared';

const PAGE_SRC = readFileSync(
  resolve(__dirname, '../analysis/page.tsx'),
  'utf-8',
);

// wave-565: 완전수렴 픽 시즌 최장 streak 배지 guard
// analysis/page.tsx: getConvergencePickBestStreak(FACTOR_PICK_COMPLETE) → completeBestStreak
//
// 불변:
//   - wave-554(강수렴 최장 streak) 동일 함수 · FACTOR_PICK_COMPLETE 임계값 적용
//   - completeBestStreak !== null 시 "최장 N연승/패" 텍스트 표시
//   - 강수렴(wave-554): convergenceBestStreak / 완전수렴(wave-565): completeBestStreak 대칭 구조

describe('wave-565: complete convergence best streak', () => {
  describe('analysis/page.tsx callsite', () => {
    it('getConvergencePickBestStreak(FACTOR_PICK_COMPLETE) 호출', () => {
      expect(PAGE_SRC).toMatch(/getConvergencePickBestStreak\s*\(\s*FACTOR_PICK_COMPLETE\s*\)/);
    });

    it('completeBestStreak 변수 사용', () => {
      expect(PAGE_SRC).toMatch(/completeBestStreak/);
    });

    it('wave-565 주석 존재', () => {
      expect(PAGE_SRC).toMatch(/wave-565/);
    });
  });

  describe('computeConvergenceBestStreak 순수 함수 (wave-554 동일)', () => {
    it('빈 배열 → null', () => {
      expect(computeConvergenceBestStreak([])).toBeNull();
    });

    it('1경기 단독 → null (2경기 미만은 streak 아님)', () => {
      expect(computeConvergenceBestStreak([true])).toBeNull();
      expect(computeConvergenceBestStreak([false])).toBeNull();
    });

    it('2연승 → { type: win, length: 2 }', () => {
      expect(computeConvergenceBestStreak([true, true])).toEqual({ type: 'win', length: 2 });
    });

    it('3연승 후 1패 후 2연패 → best = 3연승', () => {
      expect(computeConvergenceBestStreak([true, false, false, true, true, true])).toEqual({ type: 'win', length: 3 });
    });

    it('동점 시 win 우선', () => {
      expect(computeConvergenceBestStreak([true, true, false, false])).toEqual({ type: 'win', length: 2 });
    });

    it('완전수렴 엄격 필터 → 샘플 적을 때 null 정상', () => {
      expect(computeConvergenceBestStreak([])).toBeNull();
    });
  });

  describe('FACTOR_PICK_COMPLETE 상수 정합', () => {
    it('FACTOR_PICK_COMPLETE(10) > FACTOR_PICK_STRONG(8) — 완전수렴은 강수렴보다 엄격', () => {
      expect(FACTOR_PICK_COMPLETE).toBeGreaterThan(FACTOR_PICK_STRONG);
    });
  });
});
