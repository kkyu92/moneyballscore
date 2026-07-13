/**
 * wave-246 regression guard — methodology page 사용자 가시 n stale drift.
 *
 * Root: cycle 1460 test cohort n=178 (broader plan #16 2차 fire) vs
 *       cycle 1545 DB 실측 n=165 (verified pre_game 직접 쿼리, weekly-review).
 *       측정 기준 불일치 -13 gap = carry-over.
 *
 * 사용자 가시 methodology page 는 DB 실측값 n=165 노출 (cycle 1545 재측정 기반).
 * 히스토릭 comment refs (packages 안 src ts 파일) 안 cycle 1460 evidence 로 n=178 유지 OK.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(__dirname, '../../../../..');
const METHODOLOGY_SRC = readFileSync(
  join(REPO_ROOT, 'apps/moneyball/src/app/methodology/page.tsx'),
  'utf-8',
);

describe('wave-246: methodology page n stale drift', () => {
  it('no stale n=178 user-facing ref', () => {
    expect(METHODOLOGY_SRC).not.toContain('n=178');
  });
  it('current DB 실측 n=165 present', () => {
    expect(METHODOLOGY_SRC).toContain('n=165');
  });
  it('v1.8 유지 확정 label preserved', () => {
    expect(METHODOLOGY_SRC).toContain('v1.8 유지 확정');
  });
});
