import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MISS_REPORT_LIMIT, ANALYSIS_TOP_FACTORS_LIMIT } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 296 — MISS_REPORT_LIMIT + ANALYSIS_TOP_FACTORS_LIMIT', () => {
  it('MISS_REPORT_LIMIT is a positive integer', () => {
    expect(typeof MISS_REPORT_LIMIT).toBe('number');
    expect(Number.isInteger(MISS_REPORT_LIMIT)).toBe(true);
    expect(MISS_REPORT_LIMIT).toBeGreaterThan(0);
  });

  it('MISS_REPORT_LIMIT value matches expected 10', () => {
    expect(MISS_REPORT_LIMIT).toBe(10);
  });

  it('reviews/misses/page.tsx uses MISS_REPORT_LIMIT (no hardcoded limit: 10)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/reviews/misses/page.tsx'),
      'utf8',
    );
    expect(src).toContain('MISS_REPORT_LIMIT');
    expect(src).not.toContain('limit: 10');
    expect(src).not.toContain('Top 10"');
  });

  it('buildMissReport.ts uses MISS_REPORT_LIMIT default (no hardcoded ?? 10)', () => {
    const src = readFileSync(
      join(ROOT, 'src/lib/reviews/buildMissReport.ts'),
      'utf8',
    );
    expect(src).toContain('MISS_REPORT_LIMIT');
    expect(src).not.toMatch(/options\.limit\s*\?\?\s*10/);
  });

  it('ANALYSIS_TOP_FACTORS_LIMIT is a positive integer', () => {
    expect(typeof ANALYSIS_TOP_FACTORS_LIMIT).toBe('number');
    expect(Number.isInteger(ANALYSIS_TOP_FACTORS_LIMIT)).toBe(true);
    expect(ANALYSIS_TOP_FACTORS_LIMIT).toBeGreaterThan(0);
  });

  it('ANALYSIS_TOP_FACTORS_LIMIT value matches expected 2', () => {
    expect(ANALYSIS_TOP_FACTORS_LIMIT).toBe(2);
  });

  it('analysis/page.tsx uses ANALYSIS_TOP_FACTORS_LIMIT (no hardcoded .slice(0, 2))', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/analysis/page.tsx'),
      'utf8',
    );
    expect(src).toContain('ANALYSIS_TOP_FACTORS_LIMIT');
    expect(src).not.toContain('.slice(0, 2)');
  });
});
