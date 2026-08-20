import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

// wave-659 (cycle 2339, explore-idea heavy) — /mlb/reviews + /mlb/reviews/misses 는
// en/mlb/reviews 미러 부재였음 (cycle 2226/2227 의도적 scope 축소, plan #26 Phase 1/2 —
// weekly/monthly 서브페이지 EN 미러 부재는 유지). Header/Footer withLocale() 이 이
// 두 경로를 blanket 예외 처리해 KO 로 이탈시켰던 것을 예외 해제 + 실제 페이지 신규
// 배선으로 해결 (wave-658 analysis 미러와 동일 family — weekly/monthly 는 여전히
// EN 미러 부재라 예외 유지).

const koPage = readFileSync(path.resolve(__dirname, '../mlb/reviews/page.tsx'), 'utf8');
const enPage = readFileSync(path.resolve(__dirname, '../en/mlb/reviews/page.tsx'), 'utf8');
const koMisses = readFileSync(path.resolve(__dirname, '../mlb/reviews/misses/page.tsx'), 'utf8');
const enMisses = readFileSync(path.resolve(__dirname, '../en/mlb/reviews/misses/page.tsx'), 'utf8');
const reviewsData = readFileSync(path.resolve(__dirname, '../mlb/reviews/reviews-data.ts'), 'utf8');
const header = readFileSync(path.resolve(__dirname, '../../components/layout/Header.tsx'), 'utf8');
const footer = readFileSync(path.resolve(__dirname, '../../components/layout/Footer.tsx'), 'utf8');
const sitemap = readFileSync(path.resolve(__dirname, '../sitemap.ts'), 'utf8');

describe('wave-659 — /en/mlb/reviews 영어 미러 신규', () => {
  it('getMlbReviewsData 가 reviews-data.ts 로 이동 + ko/en 양쪽 재사용 (중복 로직 방지)', () => {
    expect(reviewsData).toContain('export async function getMlbReviewsData');
    expect(koPage).not.toContain('async function getMlbReviewsData');
    expect(koPage).toContain('getMlbReviewsData');
    expect(enPage).toContain('getMlbReviewsData');
  });

  it('en 페이지 canonical + hreflang alternates 배선 (ko 페이지도 en 역참조 추가)', () => {
    expect(enPage).toContain('${SITE_URL}/en/mlb/reviews');
    expect(enPage).toContain('ko: `${SITE_URL}/mlb/reviews`');
    expect(koPage).toContain('en: `${SITE_URL}/en/mlb/reviews`');
    expect(enMisses).toContain('ko: `${SITE_URL}/mlb/reviews/misses`');
    expect(koMisses).toContain('en: `${SITE_URL}/en/mlb/reviews/misses`');
  });

  it('en 페이지 내부 링크가 전부 /en/mlb/* prefix 사용 (KO 라우트로 이탈 금지, cycle 2139/2227 family 재발 차단)', () => {
    expect(enPage).not.toMatch(/href=\{?`\/mlb\//);
    expect(enPage).not.toMatch(/href="\/mlb\//);
    expect(enPage).toContain('/en/mlb/reviews/misses');
    expect(enMisses).not.toMatch(/href=\{?`\/mlb\//);
    expect(enMisses).toContain('/en/mlb/games/');
    expect(enMisses).toContain('/en/mlb/reviews');
  });

  it('Breadcrumb locale="en" 사용 (index + misses 양쪽)', () => {
    expect(enPage).toContain('locale="en"');
    expect(enMisses).toContain('locale="en"');
  });

  it('수렴 픽 배지 4종 + MissesSortControl locale="en" 전달', () => {
    expect(enPage).toContain('ConvergenceStreakBadges');
    expect(enPage).toMatch(/locale="en"/);
    expect(enMisses).toContain('MissesSortControl locale="en"');
  });

  it('buildMlbMissReport locale 인자 — en 페이지는 "en", ko 페이지는 미전달(기본 ko)', () => {
    expect(enMisses).toContain("buildMlbMissReport({ limit: MISS_REPORT_LIMIT, locale: \"en\" })");
    expect(koMisses).toContain('buildMlbMissReport({ limit: MISS_REPORT_LIMIT })');
  });

  it('Header/Footer withLocale — /mlb/reviews, /mlb/reviews/misses 는 예외 해제, weekly/monthly 는 예외 유지', () => {
    expect(header).not.toMatch(/href === "\/mlb\/reviews" \|\| href\.startsWith\("\/mlb\/reviews\/"\)/);
    expect(header).toContain('href.startsWith("/mlb/reviews/weekly")');
    expect(header).toContain('href.startsWith("/mlb/reviews/monthly")');
    expect(footer).not.toMatch(/href === "\/mlb\/reviews" \|\| href\.startsWith\("\/mlb\/reviews\/"\)/);
    expect(footer).toContain('href.startsWith("/mlb/reviews/weekly")');
    expect(footer).toContain('href.startsWith("/mlb/reviews/monthly")');
  });

  it('sitemap.ts 즉시 배선 (cycle 2153 family 재발 차단)', () => {
    expect(sitemap).toContain('${SITE_URL}/en/mlb/reviews`');
    expect(sitemap).toContain('${SITE_URL}/en/mlb/reviews/misses`');
  });
});
