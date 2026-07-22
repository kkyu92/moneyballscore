// wave-596: /reviews 허브 수렴 픽 팀별 시즌 성적 배지 박제
// analysis/page.tsx wave-557 computeConvergenceTeamStats/getConvergencePickTeamStats 재사용.
// 강수렴/완전수렴 픽 팀별 W/L + 승률(%) 배지. wave-592(스트리크 카드) 섹션 뒤 배치.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const reviewsHubSrc = readFileSync(
  join(__dirname, '../reviews/page.tsx'),
  'utf-8',
);

describe('wave-596: /reviews 허브 수렴 픽 팀별 성적 배지', () => {
  it('getConvergencePickTeamStats 임포트됨', () => {
    expect(reviewsHubSrc).toContain('getConvergencePickTeamStats');
  });

  it('UPCOMING_CONVERGENCE_TEAM_LIMIT / computeWinRateColorClass 임포트됨', () => {
    expect(reviewsHubSrc).toContain('UPCOMING_CONVERGENCE_TEAM_LIMIT');
    expect(reviewsHubSrc).toContain('computeWinRateColorClass');
  });

  it('강수렴/완전수렴 팀별 성적 Promise.all 병렬 조회됨', () => {
    expect(reviewsHubSrc).toContain('strongTeamStats');
    expect(reviewsHubSrc).toContain('completeTeamStats');
    expect(reviewsHubSrc).toContain('getConvergencePickTeamStats(FACTOR_PICK_STRONG)');
    expect(reviewsHubSrc).toContain('getConvergencePickTeamStats(FACTOR_PICK_COMPLETE)');
  });

  it('팀별 수렴 픽 성적 섹션 존재함', () => {
    expect(reviewsHubSrc).toContain('reviews-team-stats-title');
    expect(reviewsHubSrc).toContain('팀별 수렴 픽 성적');
  });

  it('강수렴 배지 라벨 존재함', () => {
    expect(reviewsHubSrc).toContain('🏅 강수렴:');
  });

  it('완전수렴 배지 라벨 + amber 테마 존재함', () => {
    expect(reviewsHubSrc).toContain('★ 완전수렴:');
    expect(reviewsHubSrc).toContain('bg-amber-50 dark:bg-amber-900/20');
  });

  it('배지 표시 개수는 UPCOMING_CONVERGENCE_TEAM_LIMIT 로 제한됨', () => {
    expect(reviewsHubSrc).toContain('slice(0, UPCOMING_CONVERGENCE_TEAM_LIMIT)');
  });
});
