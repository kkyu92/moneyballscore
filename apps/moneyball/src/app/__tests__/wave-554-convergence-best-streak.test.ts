import { describe, it, expect } from 'vitest';
import { computeConvergenceBestStreak } from '@/lib/analysis/convergenceRecord';

// wave-554: 강수렴 픽 시즌 최장 streak
// computeConvergenceBestStreak(results: boolean[]) → { type: 'win' | 'loss', length: number } | null
//
// 불변:
//   - 전체 배열에서 가장 긴 연속 같은 결과 구간 탐색 (현재 streak X, 역대 최장)
//   - 2경기 미만 → null
//   - 빈 배열 → null
//   - 승 최장 == 패 최장 → win 우선 반환
//   - 배열 순서 방향 무관 (최신순/과거순 동일 결과)
//
// UI 표시: '최장 N연승' (win) 또는 '최장 N연패' (loss)
// 현재 streak (wave-552) 와 함께 표시 — 시즌 최장 비교 컨텍스트

describe('wave-554: computeConvergenceBestStreak', () => {
  describe('null 반환 케이스', () => {
    it('빈 배열 → null', () => {
      expect(computeConvergenceBestStreak([])).toBeNull();
    });

    it('결과 1건 → null', () => {
      expect(computeConvergenceBestStreak([true])).toBeNull();
      expect(computeConvergenceBestStreak([false])).toBeNull();
    });

    it('모든 streak 길이 1 → null', () => {
      // W L W L W — 최장=1 < 2
      expect(computeConvergenceBestStreak([true, false, true, false, true])).toBeNull();
    });

    it('2건 교대 — 최장 1 → null', () => {
      expect(computeConvergenceBestStreak([true, false])).toBeNull();
      expect(computeConvergenceBestStreak([false, true])).toBeNull();
    });
  });

  describe('단일 streak 탐지', () => {
    it('2연승 → { type: win, length: 2 }', () => {
      expect(computeConvergenceBestStreak([true, true])).toEqual({ type: 'win', length: 2 });
    });

    it('2연패 → { type: loss, length: 2 }', () => {
      expect(computeConvergenceBestStreak([false, false])).toEqual({ type: 'loss', length: 2 });
    });

    it('5연승 → { type: win, length: 5 }', () => {
      expect(computeConvergenceBestStreak([true, true, true, true, true])).toEqual({ type: 'win', length: 5 });
    });

    it('4연패 → { type: loss, length: 4 }', () => {
      expect(computeConvergenceBestStreak([false, false, false, false])).toEqual({ type: 'loss', length: 4 });
    });
  });

  describe('중간 위치 최장 streak 탐지', () => {
    it('패-승승승-패 — 최장=3연승', () => {
      // results 최신순: 패, 승, 승, 승, 패
      const result = computeConvergenceBestStreak([false, true, true, true, false]);
      expect(result).toEqual({ type: 'win', length: 3 });
    });

    it('승-패패패패-승 — 최장=4연패', () => {
      const result = computeConvergenceBestStreak([true, false, false, false, false, true]);
      expect(result).toEqual({ type: 'loss', length: 4 });
    });

    it('끝부분 최장 — 승패패패패패', () => {
      // 최신순: 승, 패패패패패 — 최장=5연패
      const result = computeConvergenceBestStreak([true, false, false, false, false, false]);
      expect(result).toEqual({ type: 'loss', length: 5 });
    });

    it('시작부분 최장 — 승승승승승패', () => {
      // 최신순: 승승승승승, 패 — 최장=5연승
      const result = computeConvergenceBestStreak([true, true, true, true, true, false]);
      expect(result).toEqual({ type: 'win', length: 5 });
    });
  });

  describe('복수 streak 중 최장 선택', () => {
    it('2연승 + 3연패 → 3연패', () => {
      // 최신순: 승승, 패패패
      const result = computeConvergenceBestStreak([true, true, false, false, false]);
      expect(result).toEqual({ type: 'loss', length: 3 });
    });

    it('3연승 + 2연패 → 3연승', () => {
      const result = computeConvergenceBestStreak([false, false, true, true, true]);
      expect(result).toEqual({ type: 'win', length: 3 });
    });

    it('승 최장 == 패 최장 → win 우선', () => {
      // 3연승 + 3연패
      const result = computeConvergenceBestStreak([true, true, true, false, false, false]);
      expect(result).toEqual({ type: 'win', length: 3 });
    });

    it('여러 구간 중 최장 선택 — 5연승이 중간에 있을 때', () => {
      // 2연패, 5연승, 1패, 3연승, 1패
      const results = [
        false, false,               // 2연패
        true, true, true, true, true, // 5연승
        false,                      // 1패
        true, true, true,           // 3연승
        false,                      // 1패
      ];
      const result = computeConvergenceBestStreak(results);
      expect(result).toEqual({ type: 'win', length: 5 });
    });

    it('시즌 전형적 패턴: 대부분 승 중 긴 패 구간 탐지', () => {
      // 승3 패1 승2 패4 승2
      const results = [
        true, true, true,
        false,
        true, true,
        false, false, false, false,
        true, true,
      ];
      const result = computeConvergenceBestStreak(results);
      expect(result).toEqual({ type: 'loss', length: 4 });
    });
  });

  describe('computeConvergenceStreak 비교 — 최장 vs 현재', () => {
    it('현재 2연승이지만 과거 5연승 → best=5연승 (현재보다 큼)', () => {
      // 최신순: 현재 2연승, ... 과거 5연승
      const results = [true, true, false, true, true, true, true, true, false];
      const best = computeConvergenceBestStreak(results);
      expect(best).toEqual({ type: 'win', length: 5 });
    });

    it('현재 streak 이 최장일 때 — best == current', () => {
      // 최신순: 5연승 (현재) 이후 더 짧은 streak들
      const results = [true, true, true, true, true, false, true, true, false];
      const best = computeConvergenceBestStreak(results);
      expect(best).toEqual({ type: 'win', length: 5 });
    });
  });
});
