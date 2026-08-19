import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP_ROOT = join(__dirname, '..');
const SEARCH_PAGE_SRC = readFileSync(
  join(APP_ROOT, 'search/page.tsx'),
  'utf8',
);

describe('silent drift cycle 2261 — /mlb hub pages missing from search STATIC_PAGES', () => {
  it('every /mlb/<x>/page.tsx hub has a matching STATIC_PAGES slug entry', () => {
    const mlbDir = join(APP_ROOT, 'mlb');
    const hubs = readdirSync(mlbDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== '__tests__')
      .map((e) => e.name)
      .filter((name) => existsSync(join(mlbDir, name, 'page.tsx')));

    // Sanity: this list should be non-trivial — if it collapses to 0, the
    // directory scan itself broke (false-negative test), not a real pass.
    expect(hubs.length).toBeGreaterThan(5);

    const missing = hubs.filter(
      (name) => !SEARCH_PAGE_SRC.includes(`slug: '/mlb/${name}'`),
    );
    expect(missing).toEqual([]);
  });
});
