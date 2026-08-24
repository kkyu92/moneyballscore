import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SMALL_SAMPLE_N } from '@moneyball/shared';

// cycle 2532 review-code(heavy): buildWeeklyReview.ts/buildMlbWeeklyReview.ts 의
// buildFactorInsights/buildMlbFactorInsights 호출이 minSamples 하드코딩 `3` 사용 —
// 같은 그룹의 buildMonthlyReview.ts/buildMlbMonthlyReview.ts 는 SMALL_SAMPLE_N(=5,
// sweep 51 source-of-truth) 참조 중. weekly 만 놓친 동일 family (silent drift).

const weeklySrc = readFileSync(join(__dirname, '../buildWeeklyReview.ts'), 'utf8');
const mlbWeeklySrc = readFileSync(join(__dirname, '../buildMlbWeeklyReview.ts'), 'utf8');
const monthlySrc = readFileSync(join(__dirname, '../buildMonthlyReview.ts'), 'utf8');
const mlbMonthlySrc = readFileSync(join(__dirname, '../buildMlbMonthlyReview.ts'), 'utf8');

describe('silent drift cycle 2532 — weekly review factorInsights minSamples SMALL_SAMPLE_N swap', () => {
  it('buildWeeklyReview.ts: 하드코딩 `minSamples: 3` 없음 + SMALL_SAMPLE_N 참조', () => {
    expect(weeklySrc).not.toContain('minSamples: 3');
    expect(weeklySrc).toContain('minSamples: SMALL_SAMPLE_N');
  });

  it('buildMlbWeeklyReview.ts: 하드코딩 `minSamples: 3` 없음 + SMALL_SAMPLE_N 참조', () => {
    expect(mlbWeeklySrc).not.toContain('minSamples: 3');
    expect(mlbWeeklySrc).toContain('minSamples: SMALL_SAMPLE_N');
  });

  it('buildMonthlyReview.ts/buildMlbMonthlyReview.ts 는 기존부터 SMALL_SAMPLE_N 참조 (회귀 없음)', () => {
    expect(monthlySrc).toContain('minSamples: SMALL_SAMPLE_N');
    expect(mlbMonthlySrc).toContain('minSamples: SMALL_SAMPLE_N');
  });

  it('SMALL_SAMPLE_N 값은 5 (sweep 51 source-of-truth 유지)', () => {
    expect(SMALL_SAMPLE_N).toBe(5);
  });
});
