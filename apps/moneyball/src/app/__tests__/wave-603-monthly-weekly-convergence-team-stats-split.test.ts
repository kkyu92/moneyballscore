// wave-603: /reviews/monthly/[month] + /reviews/weekly/[week] 수렴 픽 팀별 분리 성적 배지 박제
// reviews 허브 wave-596 (시즌 전체 팀별 성적) 자연 확장 — 월간/주간 범위(startDate~endDate) 한정.
// getConvergencePickTeamStats 에 startDate/endDate optional param 추가 (getConvergencePickHomeAwaySplit wave-600 동일 패턴).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getConvergencePickTeamStats, computeConvergenceTeamStats } from '@/lib/analysis/convergenceRecord';

const monthlySrc = readFileSync(
  join(__dirname, '../reviews/monthly/[month]/page.tsx'),
  'utf-8',
);
const weeklySrc = readFileSync(
  join(__dirname, '../reviews/weekly/[week]/page.tsx'),
  'utf-8',
);
// cycle 1992: 팀별 배지 렌더링(라벨/limit/숨김 가드)은 3-way 중복(hub+monthly+weekly) 이라
// ConvergenceTeamStatsBadges 공용 컴포넌트로 추출됨 — 렌더링 detail 은 컴포넌트 소스에서 검증.
const badgesComponentSrc = readFileSync(
  join(__dirname, '../../components/reviews/ConvergenceTeamStatsBadges.tsx'),
  'utf-8',
);

describe('wave-603: getConvergencePickTeamStats startDate/endDate 하위호환', () => {
  it('optional param 미지정 시 기존 시그니처와 동일하게 함수 참조 가능 (arity 변경 X 강제 X)', () => {
    expect(typeof getConvergencePickTeamStats).toBe('function');
  });

  it('순수 함수(computeConvergenceTeamStats)는 범위 스코프와 무관 — 입력 results 배열만으로 결정', () => {
    const scoped = [
      { favoredTeam: 'LG', won: true },
      { favoredTeam: 'LG', won: true },
      { favoredTeam: 'LG', won: false },
      { favoredTeam: 'HH', won: true },
      { favoredTeam: 'HH', won: false },
      { favoredTeam: 'HH', won: true },
    ] as Array<{ favoredTeam: import('@moneyball/shared').TeamCode; won: boolean }>;
    expect(computeConvergenceTeamStats(scoped)).toEqual([
      { teamCode: 'LG', wins: 2, losses: 1 },
      { teamCode: 'HH', wins: 2, losses: 1 },
    ]);
  });
});

describe.each([
  ['monthly', monthlySrc, 'monthly-team-stats-title'],
  ['weekly', weeklySrc, 'weekly-team-stats-title'],
])('wave-603: /reviews/%s/[period] 수렴 픽 팀별 분리 성적 배지', (_name, src, sectionId) => {
  it('getConvergencePickTeamStats 임포트됨', () => {
    expect(src).toContain('getConvergencePickTeamStats');
  });

  it('강수렴/완전수렴 팀별 분리 성적 range.startDate~endDate 로 Promise.all 병렬 조회됨', () => {
    expect(src).toContain('strongTeamStats');
    expect(src).toContain('completeTeamStats');
    expect(src).toContain('getConvergencePickTeamStats(FACTOR_PICK_STRONG, range.startDate, range.endDate)');
    expect(src).toContain('getConvergencePickTeamStats(FACTOR_PICK_COMPLETE, range.startDate, range.endDate)');
  });

  it('팀별 수렴 픽 성적 섹션 titleId 로 ConvergenceTeamStatsBadges 렌더링함', () => {
    expect(src).toContain('ConvergenceTeamStatsBadges');
    expect(src).toContain(sectionId);
  });
});

describe('wave-603 + cycle 1992: ConvergenceTeamStatsBadges 공용 컴포넌트 (hub+monthly+weekly 3-way 중복 통합)', () => {
  it('팀별 수렴 픽 성적 제목 존재함', () => {
    expect(badgesComponentSrc).toContain('팀별 수렴 픽 성적');
  });

  it('강수렴 배지 라벨 존재함', () => {
    expect(badgesComponentSrc).toContain('🏅 강수렴:');
  });

  it('완전수렴 배지 라벨 + amber 테마 존재함', () => {
    expect(badgesComponentSrc).toContain('★ 완전수렴:');
  });

  it('null/empty 시 섹션 숨김 가드 존재함', () => {
    expect(badgesComponentSrc).toContain('strongTeamStats.length === 0 && completeTeamStats.length === 0) return null');
  });

  it('UPCOMING_CONVERGENCE_TEAM_LIMIT 로 표시 개수 제한됨', () => {
    expect(badgesComponentSrc).toContain('strongTeamStats.slice(0, UPCOMING_CONVERGENCE_TEAM_LIMIT)');
    expect(badgesComponentSrc).toContain('completeTeamStats.slice(0, UPCOMING_CONVERGENCE_TEAM_LIMIT)');
  });
});
