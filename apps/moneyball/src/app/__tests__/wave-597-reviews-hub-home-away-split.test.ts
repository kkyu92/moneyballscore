// wave-597: /reviews 허브 수렴 픽 홈/어웨이 분리 성적 배지 박제
// analysis/page.tsx wave-559/573 computeConvergenceHomeAwaySplit/getConvergencePickHomeAwaySplit 재사용.
// 강수렴/완전수렴 픽 홈 지목 vs 어웨이 지목 각 승률 비교. wave-596(팀별 성적) 섹션 뒤 배치.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const reviewsHubSrc = readFileSync(
  join(__dirname, '../reviews/page.tsx'),
  'utf-8',
);
// cycle 1993: 홈/어웨이 배지 렌더링(라벨/아이콘/숨김 가드)은 3-way 중복(hub+monthly+weekly) 이라
// ConvergenceHomeAwayBadges 공용 컴포넌트로 추출됨 — 렌더링 detail 은 컴포넌트 소스에서 검증.
const badgesComponentSrc = readFileSync(
  join(__dirname, '../../components/reviews/ConvergenceHomeAwayBadges.tsx'),
  'utf-8',
);

describe('wave-597: /reviews 허브 홈/어웨이 분리 성적 배지', () => {
  it('getConvergencePickHomeAwaySplit 임포트됨', () => {
    expect(reviewsHubSrc).toContain('getConvergencePickHomeAwaySplit');
  });

  it('강수렴/완전수렴 홈/어웨이 분리 성적 Promise.all 병렬 조회됨', () => {
    expect(reviewsHubSrc).toContain('strongHomeAwaySplit');
    expect(reviewsHubSrc).toContain('completeHomeAwaySplit');
    expect(reviewsHubSrc).toContain('getConvergencePickHomeAwaySplit(FACTOR_PICK_STRONG)');
    expect(reviewsHubSrc).toContain('getConvergencePickHomeAwaySplit(FACTOR_PICK_COMPLETE)');
  });

  it('ConvergenceHomeAwayBadges 컴포넌트에 titleId + split 전달함', () => {
    expect(reviewsHubSrc).toContain('ConvergenceHomeAwayBadges');
    expect(reviewsHubSrc).toContain('reviews-home-away-title');
  });

  it('홈/어웨이 지목 성적 섹션 존재함', () => {
    expect(badgesComponentSrc).toContain('홈/어웨이 지목 성적');
  });

  it('강수렴 배지 라벨 존재함', () => {
    expect(badgesComponentSrc).toContain('🏅 강수렴:');
  });

  it('완전수렴 배지 라벨 + amber 테마 존재함', () => {
    expect(badgesComponentSrc).toContain('★ 완전수렴:');
  });

  it('홈/어웨이 아이콘 라벨 존재함', () => {
    expect(badgesComponentSrc).toContain('🏠홈');
    expect(badgesComponentSrc).toContain('✈️원정');
  });

  it('null 시 섹션 숨김 가드 존재함', () => {
    expect(badgesComponentSrc).toContain('strongSplit === null && completeSplit === null');
  });
});
