// wave-605: 시즌 리뷰 수렴 픽 홈/어웨이·요일별·팀별 분리 성적 배지
// seasons/[year]/page.tsx 에만 없던 gap — monthly(wave-600/602/603)/weekly(wave-601/603) 는 이미 보유.
// 순수 함수/컴포넌트 변경 없음, 기존 getConvergencePick*Split/Stats 의 startDate/endDate 파라미터 재사용.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const seasonPageSrc = readFileSync(
  join(__dirname, '../seasons/[year]/page.tsx'),
  'utf-8',
);

describe('wave-605: 시즌 리뷰 수렴 픽 분리 성적 배지', () => {
  it('홈/어웨이 분리 성적 조회 + 렌더', () => {
    expect(seasonPageSrc).toContain('getConvergencePickHomeAwaySplit');
    expect(seasonPageSrc).toContain('ConvergenceHomeAwayBadges');
    expect(seasonPageSrc).toContain('season-home-away-title');
  });

  it('요일별 분리 성적 조회 + 렌더', () => {
    expect(seasonPageSrc).toContain('getConvergencePickDayOfWeekSplit');
    expect(seasonPageSrc).toContain('ConvergenceDayOfWeekBadges');
    expect(seasonPageSrc).toContain('season-day-of-week-title');
  });

  it('팀별 분리 성적 조회 + 렌더', () => {
    expect(seasonPageSrc).toContain('getConvergencePickTeamStats');
    expect(seasonPageSrc).toContain('ConvergenceTeamStatsBadges');
    expect(seasonPageSrc).toContain('season-team-stats-title');
  });

  it('시즌 startDate/endDate 재사용 (신규 range 계산 없음)', () => {
    expect(seasonPageSrc).toContain('seasonStartDate, seasonEndDate');
  });
});
