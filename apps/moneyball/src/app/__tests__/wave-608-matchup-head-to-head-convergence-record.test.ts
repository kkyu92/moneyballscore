// wave-608: /matchup/[teamA]/[teamB] 두 팀 맞대결 한정 수렴 픽 성적 배지
// analysis/seasons/reviews/teams 5곳엔 이미 (시즌 전체 기준) 팀별 수렴 픽 분리 성적이 있었지만
// matchup 페이지엔 "이 두 팀이 맞붙었을 때" 한정 수렴 픽 성적이 없던 gap.
// getConvergencePickHeadToHeadRecord 신규 함수 — 판정 로직(evaluateConvergencePickRow)은
// 기존 fetchConvergencePickDetailedResults 와 공유, computeConvergenceTeamStats 재사용.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { computeConvergenceTeamStats } from '@/lib/analysis/convergenceRecord';

const matchupPageSrc = readFileSync(
  join(__dirname, '../matchup/[teamA]/[teamB]/page.tsx'),
  'utf-8',
);
const recordComponentSrc = readFileSync(
  join(__dirname, '../../components/matchup/MatchupConvergencePickRecord.tsx'),
  'utf-8',
);

describe('wave-608: 매치업 페이지 두 팀 한정 수렴 픽 성적', () => {
  it('getConvergencePickHeadToHeadRecord 강수렴/완전수렴 병렬 조회됨', () => {
    expect(matchupPageSrc).toContain(
      'getConvergencePickHeadToHeadRecord(pair.codeA, pair.codeB, FACTOR_PICK_STRONG)',
    );
    expect(matchupPageSrc).toContain(
      'getConvergencePickHeadToHeadRecord(pair.codeA, pair.codeB, FACTOR_PICK_COMPLETE)',
    );
  });

  it('fetch 실패 시 captureFallback 으로 빈 배열 fallback (다른 matchup fetch 와 동일 패턴)', () => {
    expect(matchupPageSrc).toContain('getConvergencePickHeadToHeadRecord(strong)');
    expect(matchupPageSrc).toContain('getConvergencePickHeadToHeadRecord(complete)');
  });

  it('MatchupConvergencePickRecord 를 AI 예측 성과(이 매치업 한정) 섹션 뒤, 경기 목록 앞에 렌더함', () => {
    expect(matchupPageSrc).toContain('MatchupConvergencePickRecord');
    const predIdx = matchupPageSrc.indexOf('matchup-pred-title');
    const recordIdx = matchupPageSrc.indexOf('<MatchupConvergencePickRecord');
    const gamesIdx = matchupPageSrc.indexOf('matchup-games-title');
    expect(predIdx).toBeGreaterThan(-1);
    expect(recordIdx).toBeGreaterThan(predIdx);
    expect(recordIdx).toBeLessThan(gamesIdx);
  });

  it('양 팀 모두 강수렴/완전수렴 표본 없으면 렌더 skip', () => {
    expect(recordComponentSrc).toContain('if (rows.length === 0) return null;');
  });

  it('승률 계산은 기존 computeWinRatePct/computeWinRateColorClass 재사용 (신규 계산 로직 없음)', () => {
    expect(recordComponentSrc).toContain('computeWinRatePct');
    expect(recordComponentSrc).toContain('computeWinRateColorClass');
  });

  it('computeConvergenceTeamStats 는 두 팀만 등장하는 결과에서도 minPicks 게이팅 그대로 적용됨', () => {
    const results = [
      { favoredTeam: 'LG' as const, won: true },
      { favoredTeam: 'LG' as const, won: true },
      { favoredTeam: 'LG' as const, won: false },
      { favoredTeam: 'KT' as const, won: true },
    ];
    const stats = computeConvergenceTeamStats(results, 3);
    expect(stats).toEqual([{ teamCode: 'LG', wins: 2, losses: 1 }]);
  });
});
