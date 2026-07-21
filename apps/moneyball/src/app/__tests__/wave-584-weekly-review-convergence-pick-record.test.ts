// wave-584: 주간 리뷰 수렴 픽 성적 — getRecentConvergencePickRecord endDate 파라미터 + 주간 리뷰 UI 표시 박제
// getRecentConvergencePickRecord(limit, minFactors, startDate, endDate) 시그니처 및 weekly review 페이지 callsite 박제.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const convergenceRecordSrc = readFileSync(
  join(__dirname, '../../lib/analysis/convergenceRecord.ts'),
  'utf-8',
);

const weeklyReviewSrc = readFileSync(
  join(__dirname, '../reviews/weekly/[week]/page.tsx'),
  'utf-8',
);

describe('wave-584: 주간 리뷰 수렴 픽 성적 카드', () => {
  it('fetchConvergencePickResults 에 endDate 파라미터 추가됨', () => {
    expect(convergenceRecordSrc).toContain('endDate?: string,');
    expect(convergenceRecordSrc).toContain('.lte(\'game_date\', endDate)');
  });

  it('getRecentConvergencePickRecord 에 endDate 파라미터 전달됨', () => {
    // 4번째 파라미터로 endDate 전달
    expect(convergenceRecordSrc).toContain('fetchConvergencePickResults(cutoff, effectiveLimit, minFactors, endDate)');
  });

  it('weekly review 페이지가 강수렴/완전수렴 주간 성적을 조회함', () => {
    expect(weeklyReviewSrc).toContain('FACTOR_PICK_STRONG');
    expect(weeklyReviewSrc).toContain('FACTOR_PICK_COMPLETE');
    expect(weeklyReviewSrc).toContain('getRecentConvergencePickRecord');
    // startDate + endDate 범위 조회
    expect(weeklyReviewSrc).toContain('range.startDate, range.endDate');
  });

  it('weekly review 페이지에 수렴 픽 성적 섹션이 존재함', () => {
    expect(weeklyReviewSrc).toContain('weekly-convergence-title');
    expect(weeklyReviewSrc).toContain('강수렴 픽');
    expect(weeklyReviewSrc).toContain('★ 완전수렴 픽');
  });

  it('완전수렴 섹션이 amber 색상 테마를 사용함', () => {
    expect(weeklyReviewSrc).toContain('border-amber-500/40');
    expect(weeklyReviewSrc).toContain('text-amber-600 dark:text-amber-400');
  });
});
