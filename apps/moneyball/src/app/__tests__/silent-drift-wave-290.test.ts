import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DASHBOARD_FACTOR_TOP_N } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

const TARGET_FILE = 'src/app/dashboard/page.tsx';

describe('silent drift wave 290 — dashboard factor top N hardcoded 5 → DASHBOARD_FACTOR_TOP_N', () => {
  it(`${TARGET_FILE}: no hardcoded ".limit(5)" literal in factor query`, () => {
    const src = readFileSync(join(ROOT, TARGET_FILE), 'utf8');
    expect(src).not.toMatch(/\.limit\(5\)/);
  });

  it(`${TARGET_FILE}: no hardcoded "Top 5" text literal`, () => {
    const src = readFileSync(join(ROOT, TARGET_FILE), 'utf8');
    expect(src).not.toMatch(/Top 5[^0-9]/);
  });

  it(`${TARGET_FILE}: imports DASHBOARD_FACTOR_TOP_N from @moneyball/shared`, () => {
    const src = readFileSync(join(ROOT, TARGET_FILE), 'utf8');
    expect(src).toMatch(/DASHBOARD_FACTOR_TOP_N/);
  });

  it('DASHBOARD_FACTOR_TOP_N constant value check', () => {
    expect(DASHBOARD_FACTOR_TOP_N).toBe(5);
  });
});
