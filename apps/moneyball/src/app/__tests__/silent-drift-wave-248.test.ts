/**
 * wave-248 regression guard — stale PLAN_v5 ref removed from apps/moneyball tests.
 *
 * wave-243/244 sweep 이후 apps/moneyball/src/__tests__/ui-homepage.test.tsx 잔여
 * `PLAN_v5 Phase 4 §7.2 — 홈페이지 렌더 가드 (R3)` docstring 제거 (cycle 1552).
 * v1.8 유지 확정 (2026-07-06) 이후 v5 plan 라벨은 archive 참조로만 존재.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(__dirname, '../../../../..');
const UI_HOMEPAGE_TEST_SRC = readFileSync(
  join(REPO_ROOT, 'apps/moneyball/src/__tests__/ui-homepage.test.tsx'),
  'utf-8',
);

describe('wave-248: stale PLAN_v5 ref removed from apps/moneyball tests', () => {
  it('no PLAN_v5 ref in ui-homepage.test.tsx docstring', () => {
    expect(UI_HOMEPAGE_TEST_SRC).not.toMatch(/PLAN_v5/);
  });
  it('holds actual guard description (predictions LEFT JOIN)', () => {
    expect(UI_HOMEPAGE_TEST_SRC).toContain('predictions!inner');
    expect(UI_HOMEPAGE_TEST_SRC).toContain('LEFT JOIN');
  });
});
