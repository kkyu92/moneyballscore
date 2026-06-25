import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ROOT = apps/moneyball (consistent with wave 160 pattern)
const ROOT = join(__dirname, '../../..');
const APP_ROOT = join(ROOT, 'src/app');

// Recursively find all opengraph-image.tsx and twitter-image.tsx files
function findOgFiles(dir: string): string[] {
  const result: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      result.push(...findOgFiles(full));
    } else if (entry === 'opengraph-image.tsx' || entry === 'twitter-image.tsx') {
      result.push(full);
    }
  }
  return result;
}

const OG_FILES = findOgFiles(APP_ROOT);

describe('silent drift wave 162 — OG/twitter image spans SITE_HOST registry (86 files)', () => {
  it.each(OG_FILES)(
    '%s: no hardcoded moneyballscore.vercel.app literal',
    (filepath) => {
      const src = readFileSync(filepath, 'utf8');
      // Must not contain raw hostname literal (only {SITE_HOST} expression allowed)
      expect(src).not.toMatch(/moneyballscore\.vercel\.app/);
    },
  );

  it('packages/shared exports SITE_HOST (derived from SITE_URL)', () => {
    const src = readFileSync(
      join(ROOT, '../../packages/shared/src/site.ts'),
      'utf8',
    );
    expect(src).toMatch(/export const SITE_HOST = new URL\(SITE_URL\)\.host/);
  });

  it('packages/shared/src/index.ts re-exports SITE_HOST', () => {
    const src = readFileSync(
      join(ROOT, '../../packages/shared/src/index.ts'),
      'utf8',
    );
    expect(src).toMatch(/SITE_HOST.*from ['"]\.\/site['"]/);
  });
});
