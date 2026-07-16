import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LINEUP_WOBA_STRONG_TAG, LINEUP_WOBA_WEAK_TAG } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('silent drift wave-339 — 타선 wOBA 배지 single source (cycle 1674)', () => {
  it('LINEUP_WOBA_STRONG_TAG = 0.34 (KBO 상위 타선 임계)', () => {
    expect(LINEUP_WOBA_STRONG_TAG).toBe(0.34);
  });

  it('LINEUP_WOBA_WEAK_TAG = 0.30 (KBO 하위 타선 임계)', () => {
    expect(LINEUP_WOBA_WEAK_TAG).toBe(0.30);
  });

  it('analysis/page.tsx: imports LINEUP_WOBA_STRONG_TAG + LINEUP_WOBA_WEAK_TAG from shared', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('LINEUP_WOBA_STRONG_TAG');
    expect(src).toContain('LINEUP_WOBA_WEAK_TAG');
  });

  it('analysis/page.tsx: no hardcoded wOBA thresholds (0.34 or 0.30 literal)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).not.toMatch(/awayLineupWoba [><=]+\s*0\.34/);
    expect(src).not.toMatch(/homeLineupWoba [><=]+\s*0\.34/);
    expect(src).not.toMatch(/awayLineupWoba [><=]+\s*0\.30/);
    expect(src).not.toMatch(/homeLineupWoba [><=]+\s*0\.30/);
  });

  it('analysis/page.tsx: selects home_lineup_woba + away_lineup_woba from DB', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('home_lineup_woba');
    expect(src).toContain('away_lineup_woba');
  });

  it('analysis/page.tsx: TodayGameCard has homeLineupWoba + awayLineupWoba fields', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('homeLineupWoba');
    expect(src).toContain('awayLineupWoba');
  });

  it('analysis/page.tsx: wOBA badge renders wave-339 comment', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-339');
  });
});
