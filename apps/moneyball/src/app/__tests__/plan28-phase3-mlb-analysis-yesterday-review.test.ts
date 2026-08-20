import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// plan #28 Phase 3 (cycle 2318, explore-idea heavy) — "어제 결과" 섹션 + 주간/월간
// 리뷰 CTA 카드 임베드. 베스트 픽/업셋 픽 섹션은 MLB 표본 희소성(plan #27 Phase 3
// 리스크 노트)으로 스코프 밖 유지. 풀 리뷰 이식 아님 — /mlb/reviews/weekly,
// /mlb/reviews/monthly(cycle 2233 감사 통과, 이미 존재) 로 링크만.

const page = readFileSync(
  path.resolve(__dirname, '../mlb/analysis/page.tsx'),
  'utf8',
);
const dataFile = readFileSync(
  path.resolve(__dirname, '../mlb/analysis/analysis-data.ts'),
  'utf8',
);

describe('plan #28 Phase 3 — /mlb/analysis 어제 결과 + 주간/월간 리뷰 CTA', () => {
  it('getMlbYesterdayResults 가 deriveMlbOutcome 별도 재구현 없이 fetchMlbPredictionRowsInRange 재사용', () => {
    expect(dataFile).toContain('fetchMlbPredictionRowsInRange');
    expect(dataFile).toContain("from '@/lib/reviews/mlb-shared'");
    expect(dataFile).not.toContain('function deriveMlbOutcome');
  });

  it('getYesterdayKSTDateString 리그 무관 재사용 (KST 날짜 로직 재작성 X)', () => {
    expect(dataFile).toContain("from '@/lib/predictions/yesterdayDate'");
    expect(dataFile).toContain('getYesterdayKSTDateString()');
  });

  it('getMlbPeriodStats 경량 집계 (풀 buildMlbWeeklyReview/buildMlbMonthlyReview 미호출)', () => {
    expect(dataFile).toContain('export async function getMlbPeriodStats');
    expect(dataFile).not.toContain('buildMlbWeeklyReview(');
    expect(dataFile).not.toContain('buildMlbMonthlyReview(');
  });

  it('page.tsx 에 어제 결과 섹션 배선', () => {
    expect(page).toContain('어제 결과');
    expect(page).toContain('getMlbYesterdayResults');
  });

  it('page.tsx 에 주간/월간 리뷰 CTA 링크 배선 (/mlb/reviews/weekly, /mlb/reviews/monthly)', () => {
    expect(page).toContain('/mlb/reviews/weekly/${currentWeek.weekId}');
    expect(page).toContain('/mlb/reviews/monthly/${currentMonth.monthId}');
    expect(page).toContain("from \"@/lib/reviews/computeWeekRange\"");
    expect(page).toContain("from \"@/lib/reviews/computeMonthRange\"");
  });

  it('베스트 픽/업셋 픽 섹션 미포함 (MLB 표본 희소성 — plan #27 Phase 3 리스크 노트, 스코프 밖)', () => {
    expect(page).not.toContain('베스트 픽');
    expect(page).not.toContain('업셋 픽');
  });
});
