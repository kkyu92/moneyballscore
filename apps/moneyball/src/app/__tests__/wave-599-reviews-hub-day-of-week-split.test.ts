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
// cycle 1993: 요일별 배지 렌더링(라벨/가드)은 2-way 중복(hub+monthly) 이라
// ConvergenceDayOfWeekBadges 공용 컴포넌트로 추출됨 — 렌더링 detail 은 컴포넌트 소스에서 검증.
const badgesComponentSrc = readFileSync(
  join(__dirname, '../../components/reviews/ConvergenceDayOfWeekBadges.tsx'),
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

  it('ConvergenceDayOfWeekBadges 컴포넌트에 titleId + split 전달함', () => {
    expect(reviewsHubSrc).toContain('ConvergenceDayOfWeekBadges');
    expect(reviewsHubSrc).toContain('reviews-day-of-week-title');
  });

  it('요일별 수렴 픽 성적 섹션 존재함', () => {
    expect(badgesComponentSrc).toContain('요일별 수렴 픽 성적');
  });

  it('요일 라벨 상수 @moneyball/shared 에서 임포트됨 (review-code cycle 1980: 4곳 중복 통합, cycle 1993: 컴포넌트로 이동)', () => {
    expect(badgesComponentSrc).toContain('WEEKDAY_LABELS_KO');
    expect(badgesComponentSrc).toMatch(/WEEKDAY_LABELS_KO[\s\S]*?from "@moneyball\/shared"/);
  });

  it('강수렴 배지 라벨 존재함', () => {
    expect(badgesComponentSrc.match(/🏅 강수렴:/g)?.length).toBeGreaterThanOrEqual(1);
  });

  it('완전수렴 배지 라벨 + amber 테마 존재함', () => {
    expect(badgesComponentSrc.match(/★ 완전수렴:/g)?.length).toBeGreaterThanOrEqual(1);
  });

  it('빈 배열 시 섹션 숨김 가드 존재함', () => {
    expect(badgesComponentSrc).toContain('strongSplit.length === 0 && completeSplit.length === 0');
  });
});
