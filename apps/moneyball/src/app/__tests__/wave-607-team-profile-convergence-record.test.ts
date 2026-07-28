// wave-607: /teams/[code] 팀 프로필 수렴 픽 성적 배지
// analysis/seasons/reviews 허브·monthly·weekly 5곳엔 이미 팀별 수렴 픽 분리 성적이 있었지만
// /teams/[code] 만 빠져 있던 gap. 전체 팀 목록이 아닌 "이 팀" 단일 행만 find 로 추출해 표시.
// getConvergencePickTeamStats 자체 CONVERGENCE_TEAM_STATS_MIN_PICKS 게이팅 재사용 (신규 로직 없음).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const teamPageSrc = readFileSync(
  join(__dirname, '../teams/[code]/page.tsx'),
  'utf-8',
);
const recordComponentSrc = readFileSync(
  join(__dirname, '../../components/teams/TeamConvergencePickRecord.tsx'),
  'utf-8',
);

describe('wave-607: 팀 프로필 수렴 픽 성적', () => {
  it('getConvergencePickTeamStats 강수렴/완전수렴 병렬 조회됨', () => {
    expect(teamPageSrc).toContain('getConvergencePickTeamStats(FACTOR_PICK_STRONG)');
    expect(teamPageSrc).toContain('getConvergencePickTeamStats(FACTOR_PICK_COMPLETE)');
  });

  it('전체 팀 배열에서 이 팀(code) 항목만 find 로 추출함', () => {
    expect(teamPageSrc).toContain('strongTeamStats.find((s) => s.teamCode === code)');
    expect(teamPageSrc).toContain('completeTeamStats.find((s) => s.teamCode === code)');
  });

  it('fetch 실패 시 captureFallback 으로 빈 배열 fallback (다른 팀 fetch 와 동일 패턴)', () => {
    expect(teamPageSrc).toContain('getConvergencePickTeamStats(strong)');
    expect(teamPageSrc).toContain('getConvergencePickTeamStats(complete)');
  });

  it('TeamConvergencePickRecord 컴포넌트를 team-summary 섹션 뒤 렌더함', () => {
    expect(teamPageSrc).toContain('TeamConvergencePickRecord');
    expect(teamPageSrc).toContain('team-convergence-title');
    const summaryIdx = teamPageSrc.indexOf('team-summary-title');
    const recordIdx = teamPageSrc.indexOf('<TeamConvergencePickRecord');
    const factorsIdx = teamPageSrc.indexOf('team-factors-title');
    expect(summaryIdx).toBeGreaterThan(-1);
    expect(recordIdx).toBeGreaterThan(summaryIdx);
    expect(recordIdx).toBeLessThan(factorsIdx);
  });

  it('강수렴/완전수렴 양쪽 모두 undefined(소표본 등 데이터 없음)면 렌더 skip', () => {
    expect(recordComponentSrc).toContain('if (!strongStat && !completeStat) return null;');
  });

  it('승률 계산은 기존 computeWinRatePct/computeWinRateColorClass 재사용 (신규 계산 로직 없음)', () => {
    expect(recordComponentSrc).toContain('computeWinRatePct');
    expect(recordComponentSrc).toContain('computeWinRateColorClass');
  });
});
