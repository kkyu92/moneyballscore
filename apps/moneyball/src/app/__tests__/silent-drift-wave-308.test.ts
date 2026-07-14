import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ACCURACY_GOOD_RATE, ACCURACY_GOOD_PCT, WINNER_PROB_MID, WINNER_PROB_LEAN, WINNER_PROB_CONFIDENT } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 308 — accuracy & WP mid constants (cycle 1639)', () => {
  it('ACCURACY_GOOD_RATE is 0.6 (derived from ACCURACY_GOOD_PCT)', () => {
    expect(ACCURACY_GOOD_RATE).toBe(ACCURACY_GOOD_PCT / 100);
    expect(ACCURACY_GOOD_RATE).toBe(0.6);
  });

  it('WINNER_PROB_MID is 0.6 (midpoint of LEAN 0.55 / CONFIDENT 0.65)', () => {
    expect(WINNER_PROB_MID).toBe(0.6);
    expect(WINNER_PROB_MID).toBeGreaterThan(WINNER_PROB_LEAN);
    expect(WINNER_PROB_MID).toBeLessThan(WINNER_PROB_CONFIDENT);
  });

  it('calendar/page.tsx uses ACCURACY_GOOD_RATE (no hardcoded 0.6 in accuracy check)', () => {
    const src = readFileSync(join(ROOT, 'src/app/calendar/page.tsx'), 'utf8');
    expect(src).toContain('ACCURACY_GOOD_RATE');
    expect(src).toContain('@moneyball/shared');
    expect(src).not.toMatch(/>=\s*0\.6\b/);
  });

  it('matchup/[teamA]/[teamB]/page.tsx uses ACCURACY_GOOD_RATE', () => {
    const src = readFileSync(join(ROOT, 'src/app/matchup/[teamA]/[teamB]/page.tsx'), 'utf8');
    expect(src).toContain('ACCURACY_GOOD_RATE');
    expect(src).not.toMatch(/>=\s*0\.6\b/);
  });

  it('teams/[code]/page.tsx uses ACCURACY_GOOD_RATE', () => {
    const src = readFileSync(join(ROOT, 'src/app/teams/[code]/page.tsx'), 'utf8');
    expect(src).toContain('ACCURACY_GOOD_RATE');
    expect(src).not.toMatch(/>=\s*0\.6\b/);
  });

  it('en/mlb/team/[code]/page.tsx uses ACCURACY_GOOD_RATE', () => {
    const src = readFileSync(join(ROOT, 'src/app/en/mlb/team/[code]/page.tsx'), 'utf8');
    expect(src).toContain('ACCURACY_GOOD_RATE');
    expect(src).not.toMatch(/>=\s*0\.6\b/);
  });

  it('mlb/team/[code]/page.tsx uses ACCURACY_GOOD_RATE', () => {
    const src = readFileSync(join(ROOT, 'src/app/mlb/team/[code]/page.tsx'), 'utf8');
    expect(src).toContain('ACCURACY_GOOD_RATE');
    expect(src).not.toMatch(/>=\s*0\.6\b/);
  });

  it('reviews/monthly/[month]/page.tsx uses ACCURACY_GOOD_RATE', () => {
    const src = readFileSync(join(ROOT, 'src/app/reviews/monthly/[month]/page.tsx'), 'utf8');
    expect(src).toContain('ACCURACY_GOOD_RATE');
    expect(src).not.toMatch(/>=\s*0\.6\b/);
  });

  it('reviews/weekly/[week]/page.tsx uses ACCURACY_GOOD_RATE', () => {
    const src = readFileSync(join(ROOT, 'src/app/reviews/weekly/[week]/page.tsx'), 'utf8');
    expect(src).toContain('ACCURACY_GOOD_RATE');
    expect(src).not.toMatch(/>=\s*0\.6\b/);
  });

  it('CohortComparisonHeatmap.tsx uses ACCURACY_GOOD_RATE', () => {
    const src = readFileSync(join(ROOT, 'src/components/dashboard/CohortComparisonHeatmap.tsx'), 'utf8');
    expect(src).toContain('ACCURACY_GOOD_RATE');
    expect(src).not.toMatch(/>=\s*0\.6\b/);
  });

  it('ScoringRuleDayHeatmap.tsx uses ACCURACY_GOOD_RATE', () => {
    const src = readFileSync(join(ROOT, 'src/components/dashboard/ScoringRuleDayHeatmap.tsx'), 'utf8');
    expect(src).toContain('ACCURACY_GOOD_RATE');
    expect(src).not.toMatch(/>=\s*0\.6\b/);
  });

  it('buildConfidenceBuckets.ts uses WINNER_PROB_MID (no hardcoded 0.6 in bucket defs)', () => {
    const src = readFileSync(join(ROOT, 'src/lib/dashboard/buildConfidenceBuckets.ts'), 'utf8');
    expect(src).toContain('WINNER_PROB_MID');
    expect(src).toContain('@moneyball/shared');
    expect(src).not.toMatch(/max:\s*0\.6/);
    expect(src).not.toMatch(/min:\s*0\.6/);
  });
});
