import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2588 review-code(heavy): reviews/page.tsx (hub, 미감사 후보 — cycle 2587 carry-over)
// 헤드라인 "적중" 카운트 스탯이 text-brand-600 dark:text-brand-400 로 landing —
// 같은 family 인 reviews/weekly/[week], reviews/monthly/[month] (cycle 2585 정정) 은
// 이미 text-brand-500. DESIGN.md "적중 표시 = brand-500" family 7번째 재발
// (cycle 50/65/456/744/2563/2585 이후). 적중률(rate)은 accuracyRateColorClass
// 공용 3-tier 함수(브랜드/옐로/레드) 라 별개 의도된 컨벤션 — 범위 밖.

const hubSrc = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 2588 — reviews 허브 헤드라인 적중 색상 정렬', () => {
  it('허브 헤드라인 적중 카운트 = text-brand-500 (brand-600/dark:brand-400 drift 정정)', () => {
    expect(hubSrc).toContain('text-3xl font-bold text-brand-500 mt-1');
  });

  it('허브 헤드라인 적중 카운트에 brand-600/dark:brand-400 잔존 0건', () => {
    expect(hubSrc).not.toContain('text-3xl font-bold text-brand-600 dark:text-brand-400 mt-1');
  });

  it('적중률(rate)은 accuracyRateColorClass 공용 3-tier 함수 그대로 유지 (별개 컨벤션, 범위 밖)', () => {
    expect(hubSrc).toContain('accuracyRateColorClass(rate, true)');
  });
});
