import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FEED_GAME_LIMIT, REVIEWS_RECENT_LIMIT } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 291 — FEED_GAME_LIMIT + REVIEWS_RECENT_LIMIT hardcoded → constants', () => {
  it('feed/route.ts: no hardcoded ".limit(50)" literal', () => {
    const src = readFileSync(join(ROOT, 'src/app/feed/route.ts'), 'utf8');
    expect(src).not.toMatch(/\.limit\(50\)/);
  });

  it('feed/route.ts: imports FEED_GAME_LIMIT from @moneyball/shared', () => {
    const src = readFileSync(join(ROOT, 'src/app/feed/route.ts'), 'utf8');
    expect(src).toMatch(/FEED_GAME_LIMIT/);
  });

  it('FEED_GAME_LIMIT constant value check', () => {
    expect(FEED_GAME_LIMIT).toBe(50);
  });

  it('reviews/page.tsx: no hardcoded ".limit(100)" literal', () => {
    const src = readFileSync(join(ROOT, 'src/app/reviews/page.tsx'), 'utf8');
    expect(src).not.toMatch(/\.limit\(100\)/);
  });

  it('reviews/page.tsx: imports REVIEWS_RECENT_LIMIT from @moneyball/shared', () => {
    const src = readFileSync(join(ROOT, 'src/app/reviews/page.tsx'), 'utf8');
    expect(src).toMatch(/REVIEWS_RECENT_LIMIT/);
  });

  it('REVIEWS_RECENT_LIMIT constant value check', () => {
    expect(REVIEWS_RECENT_LIMIT).toBe(100);
  });
});
