import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP_ROOT = join(__dirname, '..');
const SITEMAP_SRC = readFileSync(join(APP_ROOT, 'sitemap.ts'), 'utf8');

// sitemap.ts 에 의도적으로 노출 안 시키는 route root — placeholder("박제 중")
// 페이지, noindex 내부 프리뷰, en 미러(별도 dynamic block 이 커버), api/route
// 핸들러. STATIC_PAGES(cycle 2262 silent-drift test)와 동일 배제 목록.
const EXCLUDED_ROOTS = new Set([
  'api',
  'en',
  'search',
  'debug',
  'login',
  'settings',
  'community',
  'v2-preview',
  'feed',
]);

function findHubSlugs(dir: string, relPrefix: string): string[] {
  const hubs: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === '__tests__' || entry.name.startsWith('[')) continue;
    const rel = `${relPrefix}/${entry.name}`;
    const full = join(dir, entry.name);
    if (existsSync(join(full, 'page.tsx'))) hubs.push(rel);
    hubs.push(...findHubSlugs(full, rel));
  }
  return hubs;
}

// redirect-only index page (예: /reviews/weekly → /reviews/weekly/{currentId})
// 는 실제 컨텐츠가 없어 sitemap 에 넣으면 redirect chain 중복 인덱싱만 유발.
// dynamic route 블록이 실제 컨텐츠 URL 을 이미 커버하므로 구조적으로 제외.
function isRedirectOnly(pageSrc: string): boolean {
  return (
    pageSrc.includes(`from "next/navigation"`) ||
    pageSrc.includes(`from 'next/navigation'`)
  ) && /redirect\(/.test(pageSrc);
}

// noindex 페이지 (예: /accuracy/shadow, /v2-shadow-monitor) 는 검색엔진에
// 의도적으로 숨긴 내부 cohort/실험 archive — sitemap 제외가 정상.
function isNoindex(pageSrc: string): boolean {
  return /robots:\s*\{\s*index:\s*false/.test(pageSrc);
}

describe('silent drift cycle 2263 — static hub pages missing from sitemap.ts', () => {
  it('every non-dynamic, non-excluded, indexable hub page.tsx has a matching sitemap.ts URL entry', () => {
    const hubs = findHubSlugs(APP_ROOT, '').filter(
      (slug) => !EXCLUDED_ROOTS.has(slug.split('/')[1]),
    );

    // Sanity: 디렉토리 스캔 자체가 깨지면 (false-negative) hubs 가 붕괴함.
    expect(hubs.length).toBeGreaterThan(20);

    const missing = hubs.filter((slug) => {
      if (SITEMAP_SRC.includes(`\${SITE_URL}${slug}\``)) return false;
      const pageSrc = readFileSync(join(APP_ROOT, slug.slice(1), 'page.tsx'), 'utf8');
      if (isRedirectOnly(pageSrc)) return false;
      if (isNoindex(pageSrc)) return false;
      return true;
    });

    expect(missing).toEqual([]);
  });
});
