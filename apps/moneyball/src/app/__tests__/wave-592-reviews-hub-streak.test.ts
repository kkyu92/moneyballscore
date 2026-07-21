// wave-592: /reviews 허브 수렴 픽 스트리크 카드 박제
// 강수렴/완전수렴 현재 streak + 시즌 최장 streak 카드 추가.
// wave-590(전체 성적) 섹션 뒤 배치.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const reviewsHubSrc = readFileSync(
  join(__dirname, '../reviews/page.tsx'),
  'utf-8',
);

describe('wave-592: /reviews 허브 수렴 픽 스트리크 카드', () => {
  it('getConvergencePickStreak / getConvergencePickBestStreak 임포트됨', () => {
    expect(reviewsHubSrc).toContain('getConvergencePickStreak');
    expect(reviewsHubSrc).toContain('getConvergencePickBestStreak');
  });

  it('KBO_SEASON_YEAR 임포트됨', () => {
    expect(reviewsHubSrc).toContain('KBO_SEASON_YEAR');
  });

  it('강수렴/완전수렴 streak Promise.all 병렬 조회됨', () => {
    expect(reviewsHubSrc).toContain('strongConvergenceStreak');
    expect(reviewsHubSrc).toContain('bestConvergenceStreak');
    expect(reviewsHubSrc).toContain('completeConvergenceStreak');
    expect(reviewsHubSrc).toContain('completeBestStreak');
    expect(reviewsHubSrc).toContain('getConvergencePickStreak(FACTOR_PICK_STRONG)');
    expect(reviewsHubSrc).toContain('getConvergencePickBestStreak()');
    expect(reviewsHubSrc).toContain('getConvergencePickStreak(FACTOR_PICK_COMPLETE)');
    expect(reviewsHubSrc).toContain('getConvergencePickBestStreak(FACTOR_PICK_COMPLETE)');
  });

  it('수렴 픽 스트리크 섹션 존재함', () => {
    expect(reviewsHubSrc).toContain('reviews-streak-title');
    expect(reviewsHubSrc).toContain('수렴 픽 스트리크');
  });

  it('강수렴 픽 현재 스트리크 카드 존재함', () => {
    expect(reviewsHubSrc).toContain('강수렴 픽 현재');
    // JSX template: {length}연{type === 'win' ? '승' : '패'} 패턴
    expect(reviewsHubSrc).toContain("? '승' : '패'");
  });

  it('완전수렴 픽 현재 스트리크 카드 amber 색상 테마 사용', () => {
    expect(reviewsHubSrc).toContain('★ 완전수렴 픽 현재');
    expect(reviewsHubSrc).toContain('border-amber-500/40');
    expect(reviewsHubSrc).toContain('text-amber-600 dark:text-amber-400');
  });

  it('시즌 최장 streak 컨텍스트 표시됨', () => {
    expect(reviewsHubSrc).toContain('최장');
    expect(reviewsHubSrc).toContain('KBO_SEASON_YEAR');
  });

  it('win/loss 조건부 색상 (🔥 amber / ❄️ sky) 사용됨', () => {
    expect(reviewsHubSrc).toContain('text-amber-500 dark:text-amber-400');
    expect(reviewsHubSrc).toContain('text-sky-500 dark:text-sky-400');
  });
});
