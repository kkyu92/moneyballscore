import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP_ROOT = join(__dirname, '..');
const SEARCH_PAGE_SRC = readFileSync(
  join(APP_ROOT, 'search/page.tsx'),
  'utf8',
);

// 검색 인덱스(STATIC_PAGES)에 의도적으로 노출 안 시키는 route root — placeholder
// ("박제 중") 페이지, noindex 내부 프리뷰, en 미러(별도 로케일 스코프), api/route
// 핸들러. 이 목록에 없는 root 는 전부 STATIC_PAGES 커버리지 대상.
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

describe('silent drift cycle 2262 — static hub pages missing from search STATIC_PAGES', () => {
  it('every non-dynamic, non-excluded hub page.tsx has a matching STATIC_PAGES slug entry', () => {
    const hubs = findHubSlugs(APP_ROOT, '').filter(
      (slug) => !EXCLUDED_ROOTS.has(slug.split('/')[1]),
    );

    // Sanity: this should stay a large, non-trivial list — if it collapses,
    // the directory scan itself broke (false-negative test), not a real pass.
    expect(hubs.length).toBeGreaterThan(20);

    const missing = hubs.filter(
      (slug) => !SEARCH_PAGE_SRC.includes(`slug: '${slug}'`),
    );
    expect(missing).toEqual([]);
  });
});
