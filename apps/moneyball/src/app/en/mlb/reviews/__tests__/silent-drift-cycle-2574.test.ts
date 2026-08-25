import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SMALL_SAMPLE_N } from '@moneyball/shared';

// cycle 2574 review-code(heavy): en/mlb/reviews/weekly/[week] + en/mlb/reviews/monthly/[month]
// cycle 2573 이 KBO reviews/weekly·monthly 헤드라인에 SMALL_SAMPLE_N 게이트를 추가했지만
// en/mlb 미러 페이지는 동기화 안 됨 — 헤드라인 "Accuracy" 스탯이 review.verifiedGames
// 표본 크기 무관 렌더링. SMALL_SAMPLE_N family 15번째 재발 (locale mirror desync).

const weeklySrc = readFileSync(
  join(__dirname, '../weekly/[week]/page.tsx'),
  'utf8',
);
const monthlySrc = readFileSync(
  join(__dirname, '../monthly/[month]/page.tsx'),
  'utf8',
);

describe('silent drift cycle 2574 — en/mlb reviews weekly/monthly 헤드라인 accuracy 소표본 게이트', () => {
  it('weekly 헤드라인이 verifiedGames < SMALL_SAMPLE_N 소표본 힌트 렌더링', () => {
    expect(weeklySrc).toContain('review.verifiedGames < SMALL_SAMPLE_N');
    expect(weeklySrc).toContain('Small sample (n&lt;{SMALL_SAMPLE_N})');
  });

  it('monthly 헤드라인이 verifiedGames < SMALL_SAMPLE_N 소표본 힌트 렌더링', () => {
    expect(monthlySrc).toContain('review.verifiedGames < SMALL_SAMPLE_N');
    expect(monthlySrc).toContain('Small sample (n&lt;{SMALL_SAMPLE_N})');
  });

  it('SMALL_SAMPLE_N 값은 5 (기존 상수 유지)', () => {
    expect(SMALL_SAMPLE_N).toBe(5);
  });
});
