import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HOME_WEEK_SCHEDULE_LIMIT,
  HOME_TODAY_PRED_LIMIT,
  HOME_NEXT_GAMES_LIMIT,
  SEARCH_DATE_QUERY_LIMIT,
  SEARCH_INDEX_PLAYER_FETCH_LIMIT,
  SEARCH_INDEX_DATE_FETCH_LIMIT,
  PREDICTIONS_HISTORY_LIMIT,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 293 — home/search/predictions hardcoded limits → constants', () => {
  // page.tsx
  it('page.tsx: no hardcoded ".limit(60)" literal', () => {
    const src = readFileSync(join(ROOT, 'src/app/page.tsx'), 'utf8');
    expect(src).not.toMatch(/\.limit\(60\)/);
  });

  it('page.tsx: no hardcoded ".limit(10)" literal in predictions query', () => {
    const src = readFileSync(join(ROOT, 'src/app/page.tsx'), 'utf8');
    expect(src).not.toMatch(/\.limit\(10\)/);
  });

  it('page.tsx: no hardcoded ".limit(30)" literal', () => {
    const src = readFileSync(join(ROOT, 'src/app/page.tsx'), 'utf8');
    expect(src).not.toMatch(/\.limit\(30\)/);
  });

  it('page.tsx: imports HOME_WEEK_SCHEDULE_LIMIT from @moneyball/shared', () => {
    const src = readFileSync(join(ROOT, 'src/app/page.tsx'), 'utf8');
    expect(src).toMatch(/HOME_WEEK_SCHEDULE_LIMIT/);
  });

  it('HOME_WEEK_SCHEDULE_LIMIT constant value check', () => {
    expect(HOME_WEEK_SCHEDULE_LIMIT).toBe(60);
  });

  it('HOME_TODAY_PRED_LIMIT constant value check', () => {
    expect(HOME_TODAY_PRED_LIMIT).toBe(10);
  });

  it('HOME_NEXT_GAMES_LIMIT constant value check', () => {
    expect(HOME_NEXT_GAMES_LIMIT).toBe(30);
  });

  // search/page.tsx
  it('search/page.tsx: no hardcoded ".limit(60)" literal', () => {
    const src = readFileSync(join(ROOT, 'src/app/search/page.tsx'), 'utf8');
    expect(src).not.toMatch(/\.limit\(60\)/);
  });

  it('search/page.tsx: no hardcoded ".limit(200)" literal', () => {
    const src = readFileSync(join(ROOT, 'src/app/search/page.tsx'), 'utf8');
    expect(src).not.toMatch(/\.limit\(200\)/);
  });

  it('search/page.tsx: imports SEARCH_DATE_QUERY_LIMIT from @moneyball/shared', () => {
    const src = readFileSync(join(ROOT, 'src/app/search/page.tsx'), 'utf8');
    expect(src).toMatch(/SEARCH_DATE_QUERY_LIMIT/);
  });

  it('SEARCH_DATE_QUERY_LIMIT constant value check', () => {
    expect(SEARCH_DATE_QUERY_LIMIT).toBe(60);
  });

  it('SEARCH_INDEX_PLAYER_FETCH_LIMIT constant value check', () => {
    expect(SEARCH_INDEX_PLAYER_FETCH_LIMIT).toBe(200);
  });

  it('SEARCH_INDEX_DATE_FETCH_LIMIT constant value check', () => {
    expect(SEARCH_INDEX_DATE_FETCH_LIMIT).toBe(200);
  });

  // predictions/page.tsx
  it('predictions/page.tsx: no hardcoded ".limit(200)" literal', () => {
    const src = readFileSync(join(ROOT, 'src/app/predictions/page.tsx'), 'utf8');
    expect(src).not.toMatch(/\.limit\(200\)/);
  });

  it('predictions/page.tsx: imports PREDICTIONS_HISTORY_LIMIT from @moneyball/shared', () => {
    const src = readFileSync(join(ROOT, 'src/app/predictions/page.tsx'), 'utf8');
    expect(src).toMatch(/PREDICTIONS_HISTORY_LIMIT/);
  });

  it('PREDICTIONS_HISTORY_LIMIT constant value check', () => {
    expect(PREDICTIONS_HISTORY_LIMIT).toBe(200);
  });
});
