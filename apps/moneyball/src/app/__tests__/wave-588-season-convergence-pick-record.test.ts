// wave-588: 시즌 리뷰 수렴 픽 성적 카드 박제
// seasons/[year]/page.tsx 에 강수렴/완전수렴 픽 시즌 성적 카드 추가.
// 시즌 시작일(`${y}-04-01`) 기준 전체 집계, ongoing 시즌은 endDate 없음.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const seasonPageSrc = readFileSync(
  join(__dirname, '../seasons/[year]/page.tsx'),
  'utf-8',
);

describe('wave-588: 시즌 리뷰 수렴 픽 성적 카드', () => {
  it('seasons page 가 강수렴/완전수렴 픽 성적을 조회함', () => {
    expect(seasonPageSrc).toContain('FACTOR_PICK_STRONG');
    expect(seasonPageSrc).toContain('FACTOR_PICK_COMPLETE');
    expect(seasonPageSrc).toContain('getRecentConvergencePickRecord');
  });

  it('시즌 시작일 04-01 기준 조회', () => {
    expect(seasonPageSrc).toContain('04-01');
  });

  it('수렴 픽 시즌 성적 섹션 존재', () => {
    expect(seasonPageSrc).toContain('season-convergence-title');
    expect(seasonPageSrc).toContain('강수렴 픽');
    expect(seasonPageSrc).toContain('완전수렴 픽');
  });

  it('완전수렴 섹션 amber 색상 테마', () => {
    expect(seasonPageSrc).toContain('border-amber-500/40');
    expect(seasonPageSrc).toContain('text-amber-600 dark:text-amber-400');
  });

  it('computeWinRatePct 사용', () => {
    expect(seasonPageSrc).toContain('computeWinRatePct');
  });
});
