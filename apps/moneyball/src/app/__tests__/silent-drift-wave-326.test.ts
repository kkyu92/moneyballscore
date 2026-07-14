import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STANDINGS_BOTTOM_TIER, STANDINGS_TOP_TIER } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('silent drift wave 326 — STANDINGS_TOP_TIER + STANDINGS_BOTTOM_TIER single source (cycle 1658)', () => {
  it('STANDINGS_TOP_TIER = 3 (KBO 상위권 1~3위)', () => {
    expect(STANDINGS_TOP_TIER).toBe(3);
  });

  it('STANDINGS_BOTTOM_TIER = 8 (KBO 하위권 8~10위)', () => {
    expect(STANDINGS_BOTTOM_TIER).toBe(8);
  });

  it('STANDINGS_TOP_TIER < STANDINGS_BOTTOM_TIER (순위 구조 유효)', () => {
    expect(STANDINGS_TOP_TIER).toBeLessThan(STANDINGS_BOTTOM_TIER);
  });

  it('analysis/page.tsx: imports STANDINGS_TOP_TIER + STANDINGS_BOTTOM_TIER from shared', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('STANDINGS_TOP_TIER');
    expect(src).toContain('STANDINGS_BOTTOM_TIER');
  });

  it('analysis/page.tsx: no hardcoded <= 3 rank check (uses STANDINGS_TOP_TIER)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).not.toMatch(/[Rr]ank\s*<=\s*3/);
    expect(src).not.toMatch(/awayRank\s*<=\s*3/);
    expect(src).not.toMatch(/homeRank\s*<=\s*3/);
  });

  it('analysis/page.tsx: no hardcoded >= 8 rank check (uses STANDINGS_BOTTOM_TIER)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).not.toMatch(/[Rr]ank\s*>=\s*8/);
    expect(src).not.toMatch(/awayRank\s*>=\s*8/);
    expect(src).not.toMatch(/homeRank\s*>=\s*8/);
  });

  it('analysis/page.tsx: uses STANDINGS_TOP_TIER in rank badge JSX', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('STANDINGS_TOP_TIER');
    expect(src).toContain('STANDINGS_BOTTOM_TIER');
  });
});
