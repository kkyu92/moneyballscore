// wave-590: /reviews 허브 수렴 픽 전체 성적 카드 — 강수렴/완전수렴 누적 W-L callsite 박제

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const reviewsHubSrc = readFileSync(
  join(__dirname, '../reviews/page.tsx'),
  'utf-8',
);

describe('wave-590: /reviews 허브 수렴 픽 전체 성적 카드', () => {
  it('FACTOR_PICK_STRONG / FACTOR_PICK_COMPLETE / CONVERGENCE_RECORD_ALL_LIMIT 임포트됨', () => {
    expect(reviewsHubSrc).toContain('FACTOR_PICK_STRONG');
    expect(reviewsHubSrc).toContain('FACTOR_PICK_COMPLETE');
    expect(reviewsHubSrc).toContain('CONVERGENCE_RECORD_ALL_LIMIT');
  });

  it('getRecentConvergencePickRecord / computeWinRatePct 임포트됨', () => {
    expect(reviewsHubSrc).toContain('getRecentConvergencePickRecord');
    expect(reviewsHubSrc).toContain('computeWinRatePct');
  });

  it('강수렴/완전수렴 Promise.all 병렬 조회됨', () => {
    expect(reviewsHubSrc).toContain('strongConvergenceRecord');
    expect(reviewsHubSrc).toContain('completeConvergenceRecord');
    expect(reviewsHubSrc).toContain('Promise.all');
    // cycle 3247 fix: startDate 생략 시 45일 lookback 으로 조용히 fallback 돼 "전체 성적"
    // 라벨과 불일치하던 버그 — KBO_SEASON_START_DATE 3번째 인자로 시즌 전체 범위 명시.
    expect(reviewsHubSrc).toContain('getRecentConvergencePickRecord(CONVERGENCE_RECORD_ALL_LIMIT, FACTOR_PICK_STRONG, KBO_SEASON_START_DATE)');
    expect(reviewsHubSrc).toContain('getRecentConvergencePickRecord(CONVERGENCE_RECORD_ALL_LIMIT, FACTOR_PICK_COMPLETE, KBO_SEASON_START_DATE)');
  });

  it('수렴 픽 전체 성적 섹션이 존재함', () => {
    expect(reviewsHubSrc).toContain('reviews-convergence-title');
    expect(reviewsHubSrc).toContain('수렴 픽 전체 성적');
    expect(reviewsHubSrc).toContain('강수렴 픽');
    expect(reviewsHubSrc).toContain('★ 완전수렴 픽');
  });

  it('완전수렴 섹션이 amber 색상 테마를 사용함', () => {
    expect(reviewsHubSrc).toContain('border-amber-500/40');
    expect(reviewsHubSrc).toContain('text-amber-600 dark:text-amber-400');
  });
});
