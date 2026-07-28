// wave-606: 시즌 리뷰 수렴 픽 스트리크 배지
// seasons/[year]/page.tsx 에만 없던 gap — monthly/weekly(wave-594) 는 이미 보유.
// 순수 함수/컴포넌트 변경 없음, 기존 getConvergencePickStreak/BestStreak 의 startDate/endDate 파라미터 재사용.
// 신규 ConvergenceStreakBadges 컴포넌트 = monthly 인라인 블록의 순수 UI 추출 (ConvergenceHomeAwayBadges/
// ConvergenceTeamStatsBadges cycle 1992/1993 과 동일 패턴).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const seasonPageSrc = readFileSync(
  join(__dirname, '../seasons/[year]/page.tsx'),
  'utf-8',
);
const streakBadgesSrc = readFileSync(
  join(__dirname, '../../components/reviews/ConvergenceStreakBadges.tsx'),
  'utf-8',
);

describe('wave-606: 시즌 리뷰 수렴 픽 스트리크 배지', () => {
  it('강수렴/완전수렴 스트리크 + 최장 스트리크 조회', () => {
    expect(seasonPageSrc).toContain('getConvergencePickStreak');
    expect(seasonPageSrc).toContain('getConvergencePickBestStreak');
  });

  it('ConvergenceStreakBadges 렌더', () => {
    expect(seasonPageSrc).toContain('ConvergenceStreakBadges');
    expect(seasonPageSrc).toContain('season-streak-title');
  });

  it('시즌 startDate/endDate 재사용 (신규 range 계산 없음)', () => {
    const streakCalls = seasonPageSrc.match(/getConvergencePick(?:Streak|BestStreak)\([^)]*\)/g) ?? [];
    expect(streakCalls.length).toBe(4);
    for (const call of streakCalls) {
      expect(call).toContain('seasonStartDate, seasonEndDate');
    }
  });

  it('null 양쪽 모두 null 이면 렌더 skip', () => {
    expect(streakBadgesSrc).toContain('if (strongStreak === null && completeStreak === null) return null;');
  });
});
