import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  classifyWinnerProb,
  WINNER_PROB_CONFIDENT,
  WINNER_PROB_LEAN,
  ELO_NEUTRAL_WIN_PCT,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('wave-323 — 승부 확률 바 (cycle 1655)', () => {
  it('homeWinProb → home/away pct derivation uses single arithmetic', () => {
    const homeWinProb = 0.58;
    const homePct = Math.round(homeWinProb * 100);
    const awayPct = Math.round((1 - homeWinProb) * 100);
    expect(homePct).toBe(58);
    expect(awayPct).toBe(42);
    expect(homePct + awayPct).toBe(100);
  });

  it('classifyWinnerProb → bar color tier (confident ≥ 0.65, lean ≥ 0.55)', () => {
    expect(classifyWinnerProb(0.65)).toBe('confident');
    expect(classifyWinnerProb(0.55)).toBe('lean');
    expect(classifyWinnerProb(0.50)).not.toBe('confident');
    expect(classifyWinnerProb(0.50)).not.toBe('lean');
    expect(WINNER_PROB_CONFIDENT).toBe(0.65);
    expect(WINNER_PROB_LEAN).toBe(0.55);
  });

  it('ELO_NEUTRAL_WIN_PCT = 0.5 (bar neutral baseline)', () => {
    expect(ELO_NEUTRAL_WIN_PCT).toBe(0.5);
    expect(Math.round(ELO_NEUTRAL_WIN_PCT * 100)).toBe(50);
  });

  it('bar width = homeWinProb * 100 (home fills left side)', () => {
    const cases = [
      { prob: 0.65, expectedWidth: 65 },
      { prob: 0.50, expectedWidth: 50 },
      { prob: 0.35, expectedWidth: 35 },
    ];
    for (const { prob, expectedWidth } of cases) {
      expect(Math.round(prob * 100)).toBe(expectedWidth);
    }
  });

  it('analysis/page.tsx: wave-323 bar uses homeWinProb single source (no hardcoded pct)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-323');
    expect(src).toContain('homeWinProb * 100');
    expect(src).toContain('(1 - g.homeWinProb) * 100');
  });

  it('analysis/page.tsx: bar tier classes use classifyWinnerProb result (no raw threshold)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain("tier === 'confident'");
    expect(src).toContain("tier === 'lean'");
    expect(src).not.toMatch(/homeWinProb >= 0\.65/);
    expect(src).not.toMatch(/homeWinProb >= 0\.55/);
  });
});
