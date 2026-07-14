import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SEARCH_FUSE_LIMIT,
  INSIGHTS_SERIES_LIMIT,
  PREDICTION_CARD_TOP_FACTORS,
  PREDICTION_CARD_LIVE_TOP_FACTORS,
  ANALOG_MATCHUP_LIMIT,
  RIVALRY_MEMORY_LIMIT,
  PICKS_RESULTS_IDS_LIMIT,
  PICKS_POLL_IDS_LIMIT,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 302 — 8 constants centralized (cycle 1630)', () => {
  it('SEARCH_FUSE_LIMIT is 60', () => {
    expect(SEARCH_FUSE_LIMIT).toBe(60);
  });

  it('INSIGHTS_SERIES_LIMIT is 60', () => {
    expect(INSIGHTS_SERIES_LIMIT).toBe(60);
  });

  it('PREDICTION_CARD_TOP_FACTORS is 2', () => {
    expect(PREDICTION_CARD_TOP_FACTORS).toBe(2);
  });

  it('PREDICTION_CARD_LIVE_TOP_FACTORS is 1', () => {
    expect(PREDICTION_CARD_LIVE_TOP_FACTORS).toBe(1);
  });

  it('ANALOG_MATCHUP_LIMIT is 3', () => {
    expect(ANALOG_MATCHUP_LIMIT).toBe(3);
  });

  it('RIVALRY_MEMORY_LIMIT is 3', () => {
    expect(RIVALRY_MEMORY_LIMIT).toBe(3);
  });

  it('PICKS_RESULTS_IDS_LIMIT is 200', () => {
    expect(PICKS_RESULTS_IDS_LIMIT).toBe(200);
  });

  it('PICKS_POLL_IDS_LIMIT is 50', () => {
    expect(PICKS_POLL_IDS_LIMIT).toBe(50);
  });

  it('SearchClient.tsx uses SEARCH_FUSE_LIMIT (no hardcoded limit: 60)', () => {
    const src = readFileSync(
      join(ROOT, 'src/components/search/SearchClient.tsx'),
      'utf8',
    );
    expect(src).toContain('SEARCH_FUSE_LIMIT');
    expect(src).not.toMatch(/limit:\s*60/);
  });

  it('insights/series.ts uses INSIGHTS_SERIES_LIMIT (no hardcoded 60)', () => {
    const src = readFileSync(
      join(ROOT, 'src/lib/insights/series.ts'),
      'utf8',
    );
    expect(src).toContain('INSIGHTS_SERIES_LIMIT');
  });

  it('picks/results/route.ts uses PICKS_RESULTS_IDS_LIMIT (no hardcoded 200)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/api/picks/results/route.ts'),
      'utf8',
    );
    expect(src).toContain('PICKS_RESULTS_IDS_LIMIT');
    expect(src).not.toMatch(/\.slice\(0,\s*200\)/);
  });

  it('picks/poll/route.ts uses PICKS_POLL_IDS_LIMIT (no hardcoded 50)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/api/picks/poll/route.ts'),
      'utf8',
    );
    expect(src).toContain('PICKS_POLL_IDS_LIMIT');
    expect(src).not.toMatch(/\.slice\(0,\s*50\)/);
  });
});
