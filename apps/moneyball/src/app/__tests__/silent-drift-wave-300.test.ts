import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SUMMARY_BAR_MIN_GAMES,
  ACCURACY_GOOD_PCT,
  ACCURACY_BASELINE_PCT,
  ACCURACY_BASELINE,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 300 — SUMMARY_BAR_MIN_GAMES + ACCURACY_GOOD_PCT + ACCURACY_BASELINE_PCT', () => {
  it('SUMMARY_BAR_MIN_GAMES is 2', () => {
    expect(SUMMARY_BAR_MIN_GAMES).toBe(2);
  });

  it('ACCURACY_GOOD_PCT is 60', () => {
    expect(ACCURACY_GOOD_PCT).toBe(60);
  });

  it('ACCURACY_BASELINE_PCT derives from ACCURACY_BASELINE', () => {
    expect(ACCURACY_BASELINE_PCT).toBe(Math.round(ACCURACY_BASELINE * 100));
    expect(ACCURACY_BASELINE_PCT).toBe(50);
  });

  it('DailyPredictionSummaryBar.tsx uses SUMMARY_BAR_MIN_GAMES (no hardcoded < 2)', () => {
    const src = readFileSync(
      join(ROOT, 'src/components/predictions/DailyPredictionSummaryBar.tsx'),
      'utf8',
    );
    expect(src).toContain('SUMMARY_BAR_MIN_GAMES');
    expect(src).not.toMatch(/predictedCount\s*<\s*2/);
  });

  it('DailyPredictionSummaryBar.tsx uses ACCURACY_GOOD_PCT (no hardcoded >= 60)', () => {
    const src = readFileSync(
      join(ROOT, 'src/components/predictions/DailyPredictionSummaryBar.tsx'),
      'utf8',
    );
    expect(src).toContain('ACCURACY_GOOD_PCT');
    expect(src).not.toMatch(/accuracyPct\s*>=\s*60/);
  });

  it('DailyPredictionSummaryBar.tsx uses ACCURACY_BASELINE_PCT (no hardcoded >= 50)', () => {
    const src = readFileSync(
      join(ROOT, 'src/components/predictions/DailyPredictionSummaryBar.tsx'),
      'utf8',
    );
    expect(src).toContain('ACCURACY_BASELINE_PCT');
    expect(src).not.toMatch(/accuracyPct\s*>=\s*50/);
  });
});
