import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FACTOR_CONTRIBUTION_SCALE,
  PICKS_TREND_HALF,
  PICKS_TREND_THRESHOLD,
  RECENT_FORM_GAMES,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 320 — PICKS_TREND_HALF + PICKS_TREND_THRESHOLD + FACTOR_CONTRIBUTION_SCALE single source (cycle 1652)', () => {
  it('PICKS_TREND_HALF = RECENT_FORM_GAMES / 2 (5+5 추세 윈도우 정합)', () => {
    expect(PICKS_TREND_HALF).toBe(RECENT_FORM_GAMES / 2);
    expect(PICKS_TREND_HALF).toBe(5);
  });

  it('PICKS_TREND_THRESHOLD = 0.1 (10% 승률 차이 = up/down 임계)', () => {
    expect(PICKS_TREND_THRESHOLD).toBe(0.1);
  });

  it('FACTOR_CONTRIBUTION_SCALE = 200 (확률 편차 → percentage points 환산)', () => {
    expect(FACTOR_CONTRIBUTION_SCALE).toBe(200);
  });

  it('buildPicksStats.ts: no hardcoded 10 in trend length check', () => {
    const src = readFileSync(
      join(ROOT, 'src/lib/picks/buildPicksStats.ts'),
      'utf8',
    );
    expect(src).toContain('PICKS_TREND_HALF');
    expect(src).toContain('PICKS_TREND_THRESHOLD');
    expect(src).toContain('RECENT_FORM_GAMES');
    // no raw 10 in trend guard (allows 10 in slice positions via constants only)
    expect(src).not.toMatch(/length >= 10\b/);
    expect(src).not.toMatch(/slice\(0, 5\)/);
    expect(src).not.toMatch(/slice\(5, 10\)/);
    expect(src).not.toMatch(/\/ 5\b.*trend|trend.*\/ 5\b/);
  });

  it('factor-explanations.ts: no hardcoded 200 in contributionPp', () => {
    const src = readFileSync(
      join(ROOT, 'src/lib/analysis/factor-explanations.ts'),
      'utf8',
    );
    expect(src).toContain('FACTOR_CONTRIBUTION_SCALE');
    expect(src).not.toMatch(/\* 200\b/);
  });
});
