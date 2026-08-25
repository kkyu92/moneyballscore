import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SMALL_SAMPLE_N } from '@moneyball/shared';

// cycle 2573 review-code(heavy): reviews/weekly/[week] + reviews/monthly/[month]
// 헤드라인 "적중률" 스탯이 review.verifiedGames 표본 크기 무관 렌더링됨 — 같은 파일
// 안 팀별 성과 테이블(SMALL_SAMPLE_N 게이트 적용)과 대조적으로 헤드라인은 미적용.
// ISO 캘린더 주/월 경계(시즌 개막 주 개막일이 주중, 올스타 휴식주, 시즌 종료월 등)엔
// verifiedGames < 5 가능 — SMALL_SAMPLE_N family 14번째 재발.

const weeklySrc = readFileSync(
  join(__dirname, '../weekly/[week]/page.tsx'),
  'utf8',
);
const monthlySrc = readFileSync(
  join(__dirname, '../monthly/[month]/page.tsx'),
  'utf8',
);

describe('silent drift cycle 2573 — reviews weekly/monthly 헤드라인 적중률 소표본 게이트', () => {
  it('weekly 헤드라인이 verifiedGames < SMALL_SAMPLE_N 소표본 힌트 렌더링', () => {
    expect(weeklySrc).toContain('review.verifiedGames < SMALL_SAMPLE_N');
    expect(weeklySrc).toContain('소표본(n&lt;{SMALL_SAMPLE_N})');
  });

  it('monthly 헤드라인이 verifiedGames < SMALL_SAMPLE_N 소표본 힌트 렌더링', () => {
    expect(monthlySrc).toContain('review.verifiedGames < SMALL_SAMPLE_N');
    expect(monthlySrc).toContain('소표본(n&lt;{SMALL_SAMPLE_N})');
  });

  it('SMALL_SAMPLE_N 값은 5 (기존 상수 유지)', () => {
    expect(SMALL_SAMPLE_N).toBe(5);
  });
});
