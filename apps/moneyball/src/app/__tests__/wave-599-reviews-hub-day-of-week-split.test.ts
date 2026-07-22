// wave-599: /reviews 허브 요일별 분리 성적 배지 박제
// convergenceRecord.ts getConvergencePickDayOfWeekSplit 신규 — 페이지 metadata 가 이미 공약한
// "팀별·요일별 분해" 중 요일별 분해가 미구현이던 gap 을 wave-596(팀별)/wave-597(홈어웨이) 뒤 이어서 충족.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const reviewsHubSrc = readFileSync(
  join(__dirname, '../reviews/page.tsx'),
  'utf-8',
);

describe('wave-599: /reviews 허브 요일별 분리 성적 배지', () => {
  it('getConvergencePickDayOfWeekSplit 임포트됨', () => {
    expect(reviewsHubSrc).toContain('getConvergencePickDayOfWeekSplit');
  });

  it('강수렴/완전수렴 요일별 분리 성적 Promise.all 병렬 조회됨', () => {
    expect(reviewsHubSrc).toContain('strongDayOfWeekSplit');
    expect(reviewsHubSrc).toContain('completeDayOfWeekSplit');
    expect(reviewsHubSrc).toContain('getConvergencePickDayOfWeekSplit(FACTOR_PICK_STRONG)');
    expect(reviewsHubSrc).toContain('getConvergencePickDayOfWeekSplit(FACTOR_PICK_COMPLETE)');
  });

  it('요일별 수렴 픽 성적 섹션 존재함', () => {
    expect(reviewsHubSrc).toContain('reviews-day-of-week-title');
    expect(reviewsHubSrc).toContain('요일별 수렴 픽 성적');
  });

  it('요일 라벨 상수 @moneyball/shared 에서 임포트됨 (review-code cycle 1980: 4곳 중복 통합)', () => {
    expect(reviewsHubSrc).toContain('WEEKDAY_LABELS_KO');
    expect(reviewsHubSrc).toMatch(/WEEKDAY_LABELS_KO[\s\S]*?from '@moneyball\/shared'/);
  });

  it('강수렴 배지 라벨 존재함', () => {
    expect(reviewsHubSrc.match(/🏅 강수렴:/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('완전수렴 배지 라벨 + amber 테마 존재함', () => {
    expect(reviewsHubSrc.match(/★ 완전수렴:/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('빈 배열 시 섹션 숨김 가드 존재함', () => {
    expect(reviewsHubSrc).toContain('strongDayOfWeekSplit.length > 0 || completeDayOfWeekSplit.length > 0');
  });
});
