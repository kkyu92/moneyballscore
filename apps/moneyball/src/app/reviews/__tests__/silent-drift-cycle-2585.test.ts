import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2585 review-code(heavy): reviews/weekly/[week] vs reviews/monthly/[month]
// 헤드라인 "적중"/"적중률" 스탯 색상이 weekly=text-brand-500 (cycle 240) vs
// monthly=text-brand-600 dark:text-brand-400 (cycle 250) 로 두 병렬 마이그레이션이
// 서로 다른 brand shade 로 landing — DESIGN.md "적중 표시 = brand-500" family
// 6번째 재발 (cycle 50/65/456/744/2563 이후). monthly 를 weekly + 문서 규칙에 정렬.

const weeklySrc = readFileSync(
  join(__dirname, '../weekly/[week]/page.tsx'),
  'utf8',
);
const monthlySrc = readFileSync(
  join(__dirname, '../monthly/[month]/page.tsx'),
  'utf8',
);

describe('silent drift cycle 2585 — reviews weekly/monthly 헤드라인 적중 색상 정렬', () => {
  it('weekly 헤드라인 적중/적중률 = text-brand-500 (기존, 변경 없음)', () => {
    expect(weeklySrc).toContain('text-3xl font-bold text-brand-500 mt-1');
    expect(weeklySrc).toContain('? "text-brand-500"');
  });

  it('monthly 헤드라인 적중/적중률/전월대비 = text-brand-500 (brand-600/dark:brand-400 drift 정정)', () => {
    expect(monthlySrc).toContain('text-3xl font-bold text-brand-500 mt-1');
    expect(monthlySrc.match(/\? "text-brand-500"/g)?.length).toBe(2);
  });

  it('monthly 헤드라인 3곳에 brand-600/dark:brand-400 잔존 0건 (강수렴 픽 라벨 등 별개 컨텍스트는 범위 밖)', () => {
    const headlineSection = monthlySrc.slice(
      monthlySrc.indexOf('monthly-summary-title'),
      monthlySrc.indexOf('monthly-convergence-title'),
    );
    expect(headlineSection).not.toContain('text-brand-600 dark:text-brand-400');
  });
});
