// wave-625: /mlb/team/[code] 팀별 시즌 전체 강수렴/완전수렴 픽 성적 — TeamConvergencePickRecord(KBO
// wave-607) 의 MLB 대응. matchup 페이지엔 이미 두 팀 한정 집계(MlbMatchupConvergencePickRecord,
// plan #24 Phase 3c)가 있었지만 팀 프로필 단독 페이지엔 시즌 전체 집계가 빠져 있던 gap.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { computeConvergenceTeamStats } from '@/lib/analysis/convergenceRecord';

const koPageSrc = readFileSync(join(__dirname, '../mlb/team/[code]/page.tsx'), 'utf-8');
const enPageSrc = readFileSync(join(__dirname, '../en/mlb/team/[code]/page.tsx'), 'utf-8');
const recordComponentSrc = readFileSync(
  join(__dirname, '../../components/teams/MlbTeamConvergencePickRecord.tsx'),
  'utf-8',
);

describe('wave-625: MLB 팀 프로필 페이지 시즌 전체 수렴 픽 성적', () => {
  it('getMlbConvergencePickTeamStats 강수렴/완전수렴 병렬 조회됨 (KO+EN 양쪽)', () => {
    for (const src of [koPageSrc, enPageSrc]) {
      expect(src).toContain('getMlbConvergencePickTeamStats(MLB_FACTOR_PICK_STRONG)');
      expect(src).toContain('getMlbConvergencePickTeamStats(MLB_FACTOR_PICK_COMPLETE)');
    }
  });

  it('fetch 실패 시 captureFallback 으로 빈 배열 fallback', () => {
    for (const src of [koPageSrc, enPageSrc]) {
      expect(src).toContain('getMlbConvergencePickTeamStats(strong)');
      expect(src).toContain('getMlbConvergencePickTeamStats(complete)');
    }
  });

  it('MlbTeamConvergencePickRecord 를 factor averages 섹션 뒤, Elo 추이 섹션 앞에 렌더함', () => {
    for (const src of [koPageSrc, enPageSrc]) {
      const recordIdx = src.indexOf('<MlbTeamConvergencePickRecord');
      const eloIdx = src.indexOf('mlb-team-elo-trend-title');
      expect(recordIdx).toBeGreaterThan(-1);
      expect(eloIdx).toBeGreaterThan(-1);
      expect(recordIdx).toBeLessThan(eloIdx);
    }
  });

  it('EN 페이지는 locale="en" 을 명시 전달함', () => {
    expect(enPageSrc).toContain('<MlbTeamConvergencePickRecord');
    const recordBlock = enPageSrc.slice(
      enPageSrc.indexOf('<MlbTeamConvergencePickRecord'),
      enPageSrc.indexOf('/>', enPageSrc.indexOf('<MlbTeamConvergencePickRecord')),
    );
    expect(recordBlock).toContain('locale="en"');
  });

  it('강수렴/완전수렴 표본 모두 없으면 렌더 skip', () => {
    expect(recordComponentSrc).toContain('if (!strongStat && !completeStat) return null;');
  });

  it('KO+EN locale 문자열 분기 보유 (MlbMatchupConvergencePickRecord 동일 패턴)', () => {
    expect(recordComponentSrc).toContain('locale = "ko"');
    expect(recordComponentSrc).toContain('en:');
  });

  it('computeConvergenceTeamStats 는 generic 이라 MlbTeamCode 로도 동일하게 동작함 (재확인)', () => {
    const results = [
      { favoredTeam: 'LAD' as const, won: true },
      { favoredTeam: 'LAD' as const, won: false },
      { favoredTeam: 'LAD' as const, won: true },
      { favoredTeam: 'SFG' as const, won: false },
    ];
    const stats = computeConvergenceTeamStats(results, 3);
    expect(stats).toEqual([{ teamCode: 'LAD', wins: 2, losses: 1 }]);
  });
});
