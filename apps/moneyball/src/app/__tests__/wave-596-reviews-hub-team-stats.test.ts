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

  it('강수렴/완전수렴 팀별 성적 Promise.all 병렬 조회됨', () => {
    expect(reviewsHubSrc).toContain('strongTeamStats');
    expect(reviewsHubSrc).toContain('completeTeamStats');
    expect(reviewsHubSrc).toContain('getConvergencePickTeamStats(FACTOR_PICK_STRONG)');
    expect(reviewsHubSrc).toContain('getConvergencePickTeamStats(FACTOR_PICK_COMPLETE)');
  });

  // cycle 1992: 배지 렌더링(라벨/limit/숨김 가드)은 hub+monthly+weekly 3-way 중복이라
  // ConvergenceTeamStatsBadges 공용 컴포넌트로 추출됨 — detail 검증은
  // wave-603 테스트의 "ConvergenceTeamStatsBadges 공용 컴포넌트" describe 참조.
  it('팀별 수렴 픽 성적 섹션 titleId 로 ConvergenceTeamStatsBadges 렌더링함', () => {
    expect(reviewsHubSrc).toContain('ConvergenceTeamStatsBadges');
    expect(reviewsHubSrc).toContain('reviews-team-stats-title');
  });
});
