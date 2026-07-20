import { describe, it, expect } from 'vitest';
import { computeConvergenceHomeAwaySplit } from '@/lib/analysis/convergenceRecord';

// wave-559: 강수렴 픽 홈/어웨이 분리 성적
// computeConvergenceHomeAwaySplit(results, minPicks) → { home, away } | null
//
// 불변:
//   - 빈 배열 → null
//   - 홈 또는 어웨이 지목 경기 수가 minPicks 미달 → null
//   - 홈 지목 경기(favoredHome=true)와 어웨이 지목 경기(favoredHome=false) 독립 집계
//   - home.wins + home.losses = favoredHome=true 경기 수
//   - away.wins + away.losses = favoredHome=false 경기 수
//   - minPicks 기본값 = CONVERGENCE_HOME_AWAY_MIN_PICKS(5)

describe('wave-559: computeConvergenceHomeAwaySplit', () => {
  describe('빈/소표본 케이스', () => {
    it('빈 배열 → null', () => {
      expect(computeConvergenceHomeAwaySplit([])).toBeNull();
    });

    it('홈 지목만 있고 어웨이 minPicks 미달 → null', () => {
      const results = [
        { favoredHome: true, won: true },
        { favoredHome: true, won: true },
        { favoredHome: true, won: false },
        { favoredHome: true, won: true },
        { favoredHome: true, won: false },
        // 어웨이: 0경기 → minPicks(5) 미달
      ];
      expect(computeConvergenceHomeAwaySplit(results, 5)).toBeNull();
    });

    it('어웨이 지목만 있고 홈 minPicks 미달 → null', () => {
      const results = [
        { favoredHome: false, won: true },
        { favoredHome: false, won: true },
        { favoredHome: false, won: false },
        { favoredHome: false, won: true },
        { favoredHome: false, won: false },
        // 홈: 0경기 → minPicks(5) 미달
      ];
      expect(computeConvergenceHomeAwaySplit(results, 5)).toBeNull();
    });

    it('홈 4경기 / 어웨이 5경기 — minPicks=5 시 null', () => {
      const results = [
        { favoredHome: true, won: true },
        { favoredHome: true, won: true },
        { favoredHome: true, won: false },
        { favoredHome: true, won: true },
        // 홈: 4경기 (5 미달)
        { favoredHome: false, won: true },
        { favoredHome: false, won: true },
        { favoredHome: false, won: false },
        { favoredHome: false, won: true },
        { favoredHome: false, won: false },
        // 어웨이: 5경기
      ];
      expect(computeConvergenceHomeAwaySplit(results, 5)).toBeNull();
    });

    it('minPicks=1 이면 1경기씩도 non-null', () => {
      const results = [
        { favoredHome: true, won: true },
        { favoredHome: false, won: false },
      ];
      expect(computeConvergenceHomeAwaySplit(results, 1)).not.toBeNull();
    });
  });

  describe('집계 정확성', () => {
    it('홈 5승 3패 / 어웨이 4승 6패 — 각각 정확 집계', () => {
      const results = [
        // 홈 지목: 5승 3패
        { favoredHome: true, won: true },
        { favoredHome: true, won: true },
        { favoredHome: true, won: true },
        { favoredHome: true, won: true },
        { favoredHome: true, won: true },
        { favoredHome: true, won: false },
        { favoredHome: true, won: false },
        { favoredHome: true, won: false },
        // 어웨이 지목: 4승 6패
        { favoredHome: false, won: true },
        { favoredHome: false, won: true },
        { favoredHome: false, won: true },
        { favoredHome: false, won: true },
        { favoredHome: false, won: false },
        { favoredHome: false, won: false },
        { favoredHome: false, won: false },
        { favoredHome: false, won: false },
        { favoredHome: false, won: false },
        { favoredHome: false, won: false },
      ];
      const split = computeConvergenceHomeAwaySplit(results, 5);
      expect(split).not.toBeNull();
      expect(split!.home).toEqual({ wins: 5, losses: 3 });
      expect(split!.away).toEqual({ wins: 4, losses: 6 });
    });

    it('홈/어웨이 모두 0패 — losses=0', () => {
      const results = [
        { favoredHome: true, won: true },
        { favoredHome: true, won: true },
        { favoredHome: true, won: true },
        { favoredHome: true, won: true },
        { favoredHome: true, won: true },
        { favoredHome: false, won: true },
        { favoredHome: false, won: true },
        { favoredHome: false, won: true },
        { favoredHome: false, won: true },
        { favoredHome: false, won: true },
      ];
      const split = computeConvergenceHomeAwaySplit(results, 5);
      expect(split!.home.losses).toBe(0);
      expect(split!.away.losses).toBe(0);
    });

    it('순서 무관 — 홈/어웨이 섞인 배열도 정확 집계', () => {
      const results = [
        { favoredHome: true, won: true },
        { favoredHome: false, won: false },
        { favoredHome: true, won: false },
        { favoredHome: false, won: true },
        { favoredHome: true, won: true },
        { favoredHome: false, won: false },
        { favoredHome: true, won: true },
        { favoredHome: false, won: true },
        { favoredHome: true, won: false },
        { favoredHome: false, won: false },
      ];
      const split = computeConvergenceHomeAwaySplit(results, 5);
      // 홈: 5경기 (3승 2패), 어웨이: 5경기 (2승 3패)
      expect(split!.home).toEqual({ wins: 3, losses: 2 });
      expect(split!.away).toEqual({ wins: 2, losses: 3 });
    });
  });

  describe('minPicks 경계값', () => {
    it('홈/어웨이 각각 정확히 minPicks=5 → non-null', () => {
      const results = Array.from({ length: 10 }, (_, i) => ({
        favoredHome: i < 5,
        won: true,
      }));
      expect(computeConvergenceHomeAwaySplit(results, 5)).not.toBeNull();
    });

    it('홈/어웨이 각각 minPicks=5, 홈 4경기 → null', () => {
      const results = [
        ...Array.from({ length: 4 }, () => ({ favoredHome: true, won: true })),
        ...Array.from({ length: 5 }, () => ({ favoredHome: false, won: true })),
      ];
      expect(computeConvergenceHomeAwaySplit(results, 5)).toBeNull();
    });
  });
});
