import { describe, it, expect } from 'vitest';
import { computeConvergenceTeamStats } from '@/lib/analysis/convergenceRecord';

// wave-557: 강수렴 픽 팀별 시즌 성적
// computeConvergenceTeamStats(results, minPicks) → { teamCode, wins, losses }[]
//
// 불변:
//   - 빈 배열 → []
//   - minPicks 미달 팀 제외
//   - 총 경기 수 내림차순 정렬 (같으면 승 수 내림차순)
//   - 각 팀의 wins + losses = 해당 팀 등장 횟수
//   - minPicks 기본값 = CONVERGENCE_TEAM_STATS_MIN_PICKS(3)
//
// UI 표시: 팀명 + 승률(%) — pct≥60% 녹색, pct≤40% 빨간, 그 외 회색

describe('wave-557: computeConvergenceTeamStats', () => {
  describe('빈/소표본 케이스', () => {
    it('빈 배열 → []', () => {
      expect(computeConvergenceTeamStats([])).toEqual([]);
    });

    it('모든 팀이 minPicks 미달이면 → []', () => {
      const results = [
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'KT' as const, won: false },
      ];
      // minPicks=3, 각 팀 1경기 → 모두 제외
      expect(computeConvergenceTeamStats(results, 3)).toEqual([]);
    });

    it('minPicks=1 이면 1경기 팀도 포함', () => {
      const results = [
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'KT' as const, won: false },
      ];
      const stats = computeConvergenceTeamStats(results, 1);
      expect(stats).toHaveLength(2);
    });
  });

  describe('집계 정확성', () => {
    it('LG 3승 1패 → wins=3 losses=1', () => {
      const results = [
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'LG' as const, won: false },
      ];
      const stats = computeConvergenceTeamStats(results, 3);
      expect(stats).toHaveLength(1);
      expect(stats[0]).toMatchObject({ teamCode: 'LG', wins: 3, losses: 1 });
    });

    it('복수 팀 집계 — 각 팀 독립 집계', () => {
      const results = [
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'LG' as const, won: false },
        { favoredTeam: 'KT' as const, won: false },
        { favoredTeam: 'KT' as const, won: false },
        { favoredTeam: 'KT' as const, won: false },
      ];
      const stats = computeConvergenceTeamStats(results, 3);
      expect(stats).toHaveLength(2);
      const lg = stats.find(s => s.teamCode === 'LG');
      const kt = stats.find(s => s.teamCode === 'KT');
      expect(lg).toMatchObject({ wins: 2, losses: 1 });
      expect(kt).toMatchObject({ wins: 0, losses: 3 });
    });
  });

  describe('정렬 순서', () => {
    it('총 경기 수 내림차순 정렬', () => {
      const results = [
        // KT: 3경기
        { favoredTeam: 'KT' as const, won: true },
        { favoredTeam: 'KT' as const, won: true },
        { favoredTeam: 'KT' as const, won: false },
        // LG: 5경기
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'LG' as const, won: false },
        { favoredTeam: 'LG' as const, won: false },
        // SS(SSG): 4경기
        { favoredTeam: 'SS' as const, won: true },
        { favoredTeam: 'SS' as const, won: true },
        { favoredTeam: 'SS' as const, won: true },
        { favoredTeam: 'SS' as const, won: false },
      ];
      const stats = computeConvergenceTeamStats(results, 3);
      expect(stats[0].teamCode).toBe('LG');   // 5경기
      expect(stats[1].teamCode).toBe('SS');   // 4경기
      expect(stats[2].teamCode).toBe('KT');   // 3경기
    });

    it('총 경기 수 같으면 승 수 내림차순', () => {
      const results = [
        // LG: 3경기 3승
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'LG' as const, won: true },
        // KT: 3경기 1승
        { favoredTeam: 'KT' as const, won: true },
        { favoredTeam: 'KT' as const, won: false },
        { favoredTeam: 'KT' as const, won: false },
      ];
      const stats = computeConvergenceTeamStats(results, 3);
      expect(stats[0].teamCode).toBe('LG');  // 3승 우선
      expect(stats[1].teamCode).toBe('KT');
    });
  });

  describe('minPicks 필터', () => {
    it('minPicks=3 기본값 — 2경기 팀 제외', () => {
      const results = [
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'LG' as const, won: false },
        { favoredTeam: 'KT' as const, won: true },
        { favoredTeam: 'KT' as const, won: true },
        { favoredTeam: 'KT' as const, won: false },
      ];
      const stats = computeConvergenceTeamStats(results); // default minPicks=3
      expect(stats).toHaveLength(1);
      expect(stats[0].teamCode).toBe('KT');
    });

    it('minPicks=5 — 5경기 이상 팀만', () => {
      const results = [
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'LG' as const, won: true },
        { favoredTeam: 'LG' as const, won: false },  // LG: 4경기
        { favoredTeam: 'KT' as const, won: true },
        { favoredTeam: 'KT' as const, won: true },
        { favoredTeam: 'KT' as const, won: true },
        { favoredTeam: 'KT' as const, won: false },
        { favoredTeam: 'KT' as const, won: false },  // KT: 5경기
      ];
      const stats = computeConvergenceTeamStats(results, 5);
      expect(stats).toHaveLength(1);
      expect(stats[0].teamCode).toBe('KT');
    });
  });
});
