import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_COMPLETE } from '@moneyball/shared';
import { computeWeeklyConvergenceRecord } from '@/lib/analysis/convergenceRecord';

// wave-569: 완전수렴 픽 이번 달 성적 guard
// getRecentConvergencePickRecord(limit, FACTOR_PICK_COMPLETE, currentMonth.startDate) 호출 패턴
// 월간 집계는 강수렴 wave-546 패턴 동기 — startDate 지정 시 limit 무시 전체 집계
// computeWeeklyConvergenceRecord 는 wave-568 순수 함수 — 동일 로직 월간 입력에도 동작
//
// 불변:
//   - |convergenceNetScore| < FACTOR_PICK_COMPLETE → 집계 제외
//   - homeScore/awayScore null → 집계 제외 (미종료 경기)
//   - convergenceNetScore > 0 → 홈 팀 우세 픽
//   - 우세 팀 승리 → wins+1, 패배 → losses+1
//   - total = wins + losses

describe('wave-569: 완전수렴 픽 이번 달 성적 guard', () => {
  describe('FACTOR_PICK_COMPLETE 상수 정합', () => {
    it('FACTOR_PICK_COMPLETE = 10', () => {
      expect(FACTOR_PICK_COMPLETE).toBe(10);
    });
  });

  describe('월간 집계 — 0건 시 배지 미표시', () => {
    it('완전수렴 경기 0건 → total=0 → 배지 미표시 조건 충족', () => {
      const result = computeWeeklyConvergenceRecord([], FACTOR_PICK_COMPLETE);
      expect(result.wins + result.losses).toBe(0);
    });

    it('FACTOR_PICK_COMPLETE 미달 경기만 → total=0', () => {
      const result = computeWeeklyConvergenceRecord([
        { convergenceNetScore: FACTOR_PICK_COMPLETE - 1, homeScore: 5, awayScore: 3 },
        { convergenceNetScore: -(FACTOR_PICK_COMPLETE - 1), homeScore: 5, awayScore: 3 },
        { convergenceNetScore: null, homeScore: 5, awayScore: 3 },
      ], FACTOR_PICK_COMPLETE);
      expect(result.wins + result.losses).toBe(0);
    });
  });

  describe('월간 집계 — 복합 시나리오', () => {
    it('한 달치 완전수렴 경기 3승 1패 + 미달 경기 혼재', () => {
      const result = computeWeeklyConvergenceRecord([
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 5, awayScore: 2 },     // 홈 우세, 홈 승 → win
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 1, awayScore: 4 },     // 홈 우세, 원정 승 → loss
        { convergenceNetScore: -FACTOR_PICK_COMPLETE, homeScore: 0, awayScore: 3 },    // 원정 우세, 원정 승 → win
        { convergenceNetScore: -FACTOR_PICK_COMPLETE, homeScore: 2, awayScore: 8 },    // 원정 우세, 원정 승 → win
        { convergenceNetScore: 5, homeScore: 3, awayScore: 1 },                        // 임계 미달 → 제외
        { convergenceNetScore: null, homeScore: 4, awayScore: 2 },                     // null → 제외
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: null, awayScore: null }, // 미종료 → 제외
      ], FACTOR_PICK_COMPLETE);
      expect(result).toEqual({ wins: 3, losses: 1 });
    });

    it('승률 계산 — total > 0 일 때 wins/total * 100 반올림', () => {
      const result = computeWeeklyConvergenceRecord([
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 5, awayScore: 2 }, // win
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 5, awayScore: 2 }, // win
        { convergenceNetScore: FACTOR_PICK_COMPLETE, homeScore: 1, awayScore: 3 }, // loss
      ], FACTOR_PICK_COMPLETE);
      expect(result.wins).toBe(2);
      expect(result.losses).toBe(1);
      expect(result.wins + result.losses).toBe(3);
      expect(Math.round(result.wins / (result.wins + result.losses) * 100)).toBe(67);
    });
  });
});
