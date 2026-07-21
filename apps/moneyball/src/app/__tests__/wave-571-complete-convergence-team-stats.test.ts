import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_COMPLETE, CONVERGENCE_TEAM_STATS_MIN_PICKS } from '@moneyball/shared';
import { computeConvergenceTeamStats, computeConvergenceHomeAwaySplit } from '@/lib/analysis/convergenceRecord';

// wave-571: 완전수렴 픽 팀별 시즌 성적 guard
// wave-573: 완전수렴 픽 홈/어웨이 분리 성적 guard
// getConvergencePickTeamStats(FACTOR_PICK_COMPLETE) / getConvergencePickHomeAwaySplit(FACTOR_PICK_COMPLETE) 호출 패턴
// 강수렴 wave-557/559 패턴 동기 — FACTOR_PICK_COMPLETE(10) 임계로 필터된 결과에 동일 순수 함수 적용

describe('wave-571: 완전수렴 픽 팀별 시즌 성적 guard', () => {
  describe('상수 정합', () => {
    it('FACTOR_PICK_COMPLETE = 10', () => {
      expect(FACTOR_PICK_COMPLETE).toBe(10);
    });

    it('CONVERGENCE_TEAM_STATS_MIN_PICKS ≥ 1', () => {
      expect(CONVERGENCE_TEAM_STATS_MIN_PICKS).toBeGreaterThanOrEqual(1);
    });
  });

  describe('빈 배열 → 빈 결과 (배지 미표시)', () => {
    it('완전수렴 픽 0건 → 팀 통계 빈 배열', () => {
      const result = computeConvergenceTeamStats([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('minPicks 필터 (CONVERGENCE_TEAM_STATS_MIN_PICKS 미달 팀 제외)', () => {
    it('minPicks=3 기준 경기 수 미달 팀 제외', () => {
      const result = computeConvergenceTeamStats([
        { favoredTeam: 'HH' as any, won: true },
        { favoredTeam: 'HH' as any, won: false },
        { favoredTeam: 'OB' as any, won: true }, // 1경기만 → 제외
      ], 3);
      expect(result.every(s => s.wins + s.losses >= 3)).toBe(true);
      expect(result.find(s => s.teamCode === 'OB')).toBeUndefined();
    });
  });

  describe('집계 정확성', () => {
    it('팀별 승패 집계 + 승리 수 내림차순 정렬', () => {
      const result = computeConvergenceTeamStats([
        { favoredTeam: 'HH' as any, won: true },
        { favoredTeam: 'HH' as any, won: true },
        { favoredTeam: 'HH' as any, won: false },
        { favoredTeam: 'OB' as any, won: true },
        { favoredTeam: 'OB' as any, won: false },
        { favoredTeam: 'OB' as any, won: false },
      ], 1);
      const hh = result.find(s => s.teamCode === 'HH');
      const ob = result.find(s => s.teamCode === 'OB');
      expect(hh).toMatchObject({ wins: 2, losses: 1 });
      expect(ob).toMatchObject({ wins: 1, losses: 2 });
    });

    it('경기 수 동점 시 wins 많은 팀 우선', () => {
      const result = computeConvergenceTeamStats([
        { favoredTeam: 'SK' as any, won: true },
        { favoredTeam: 'SK' as any, won: true },
        { favoredTeam: 'LG' as any, won: true },
        { favoredTeam: 'LG' as any, won: false },
      ], 1);
      expect(result[0].teamCode).toBe('SK');
    });
  });
});

describe('wave-573: 완전수렴 픽 홈/어웨이 분리 성적 guard', () => {
  describe('소표본 → null (배지 미표시)', () => {
    it('홈 지목 경기 minPicks 미달 → null', () => {
      const result = computeConvergenceHomeAwaySplit([
        { favoredHome: true, won: true },
        { favoredHome: false, won: true },
        { favoredHome: false, won: false },
        { favoredHome: false, won: true },
      ], 3);
      expect(result).toBeNull();
    });

    it('어웨이 지목 경기 minPicks 미달 → null', () => {
      const result = computeConvergenceHomeAwaySplit([
        { favoredHome: true, won: true },
        { favoredHome: true, won: true },
        { favoredHome: true, won: false },
        { favoredHome: false, won: true },
      ], 3);
      expect(result).toBeNull();
    });

    it('빈 배열 → null', () => {
      expect(computeConvergenceHomeAwaySplit([])).toBeNull();
    });
  });

  describe('집계 정확성', () => {
    it('홈/어웨이 각 승패 집계', () => {
      const result = computeConvergenceHomeAwaySplit([
        { favoredHome: true, won: true },
        { favoredHome: true, won: true },
        { favoredHome: true, won: false },
        { favoredHome: false, won: true },
        { favoredHome: false, won: false },
        { favoredHome: false, won: false },
      ], 3);
      expect(result).not.toBeNull();
      expect(result!.home).toEqual({ wins: 2, losses: 1 });
      expect(result!.away).toEqual({ wins: 1, losses: 2 });
    });

    it('모두 홈 지목 우세 픽 + 전승 → away 소표본 null', () => {
      const result = computeConvergenceHomeAwaySplit([
        { favoredHome: true, won: true },
        { favoredHome: true, won: true },
        { favoredHome: true, won: true },
      ], 1);
      expect(result).toBeNull();
    });
  });

  describe('경계값', () => {
    it('홈/어웨이 각 minPicks=3 정확히 충족 → non-null', () => {
      const result = computeConvergenceHomeAwaySplit([
        { favoredHome: true, won: true },
        { favoredHome: true, won: false },
        { favoredHome: true, won: true },
        { favoredHome: false, won: false },
        { favoredHome: false, won: true },
        { favoredHome: false, won: false },
      ], 3);
      expect(result).not.toBeNull();
    });
  });
});
