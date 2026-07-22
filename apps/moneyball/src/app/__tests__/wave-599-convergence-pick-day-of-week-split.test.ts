import { describe, it, expect } from 'vitest';
import { computeConvergenceDayOfWeekSplit } from '@/lib/analysis/convergenceRecord';

// wave-599: 강수렴 픽 요일별 분리 성적
// computeConvergenceDayOfWeekSplit(results, minPicks) → Array<{ dayIndex, wins, losses }>
//
// 불변:
//   - 빈 배열 → 빈 배열
//   - 요일별 경기 수가 minPicks 미달 → 그 요일 제외
//   - dayIndex 오름차순 정렬 (0=일 ~ 6=토, 팀별/홈어웨이와 달리 자연 순서 유지)
//   - minPicks 기본값 = CONVERGENCE_DAY_OF_WEEK_MIN_PICKS(3)

describe('wave-599: computeConvergenceDayOfWeekSplit', () => {
  describe('빈/소표본 케이스', () => {
    it('빈 배열 → 빈 배열', () => {
      expect(computeConvergenceDayOfWeekSplit([])).toEqual([]);
    });

    it('요일별 경기 수 minPicks 미달 → 제외', () => {
      const results = [
        { gameDate: '2026-07-20', won: true }, // 월요일
        { gameDate: '2026-07-27', won: false }, // 월요일 (2경기 — minPicks(3) 미달)
      ];
      expect(computeConvergenceDayOfWeekSplit(results, 3)).toEqual([]);
    });

    it('minPicks=1 이면 1경기씩도 표시', () => {
      const results = [{ gameDate: '2026-07-20', won: true }];
      const split = computeConvergenceDayOfWeekSplit(results, 1);
      expect(split.length).toBe(1);
    });
  });

  describe('집계 정확성', () => {
    it('월요일(2026-07-20) 3경기 2승 1패 — 정확 집계', () => {
      const results = [
        { gameDate: '2026-07-20', won: true },
        { gameDate: '2026-07-20', won: true },
        { gameDate: '2026-07-20', won: false },
      ];
      const split = computeConvergenceDayOfWeekSplit(results, 3);
      expect(split).toEqual([{ dayIndex: 1, wins: 2, losses: 1 }]);
    });

    it('여러 요일 섞인 경우 — dayIndex 오름차순 정렬', () => {
      const results = [
        // 토요일(6): 2026-07-18
        { gameDate: '2026-07-18', won: true },
        { gameDate: '2026-07-18', won: true },
        { gameDate: '2026-07-18', won: false },
        // 화요일(2): 2026-07-21
        { gameDate: '2026-07-21', won: true },
        { gameDate: '2026-07-21', won: false },
        { gameDate: '2026-07-21', won: false },
        // 일요일(0): 2026-07-19
        { gameDate: '2026-07-19', won: true },
        { gameDate: '2026-07-19', won: true },
        { gameDate: '2026-07-19', won: true },
      ];
      const split = computeConvergenceDayOfWeekSplit(results, 3);
      expect(split.map(s => s.dayIndex)).toEqual([0, 2, 6]);
      expect(split.find(s => s.dayIndex === 0)).toEqual({ dayIndex: 0, wins: 3, losses: 0 });
      expect(split.find(s => s.dayIndex === 2)).toEqual({ dayIndex: 2, wins: 1, losses: 2 });
      expect(split.find(s => s.dayIndex === 6)).toEqual({ dayIndex: 6, wins: 2, losses: 1 });
    });
  });

  describe('minPicks 경계값', () => {
    it('정확히 minPicks=3 경기 → 표시', () => {
      const results = [
        { gameDate: '2026-07-20', won: true },
        { gameDate: '2026-07-20', won: true },
        { gameDate: '2026-07-20', won: false },
      ];
      expect(computeConvergenceDayOfWeekSplit(results, 3).length).toBe(1);
    });

    it('minPicks=3, 2경기만 → 제외', () => {
      const results = [
        { gameDate: '2026-07-20', won: true },
        { gameDate: '2026-07-20', won: false },
      ];
      expect(computeConvergenceDayOfWeekSplit(results, 3)).toEqual([]);
    });
  });
});
