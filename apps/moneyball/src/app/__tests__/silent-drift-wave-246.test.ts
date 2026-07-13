/**
 * wave-246 regression guard — methodology page 사용자 가시 n stale drift.
 *
 * wave-246 (cycle 1548) 은 n=178 → n=165 replace 로 완료됐지만,
 * 하드코딩 n 자체가 stale drift 재발 root (cycle 1549 wave-247 superseded).
 *
 * wave-247 (cycle 1549): 하드코딩 n=X 제거, /accuracy 실시간 참조로 전환.
 * 본 wave-246 test 는 재발 방지 최소 assertion 유지 (v1.8 유지 확정 label + n=178 없음).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(__dirname, '../../../../..');
const METHODOLOGY_SRC = readFileSync(
  join(REPO_ROOT, 'apps/moneyball/src/app/methodology/page.tsx'),
  'utf-8',
);

describe('wave-246: methodology page n stale drift (superseded by wave-247)', () => {
  it('no stale n=178 user-facing ref', () => {
    expect(METHODOLOGY_SRC).not.toContain('n=178');
  });
  it('v1.8 유지 확정 label preserved', () => {
    expect(METHODOLOGY_SRC).toContain('v1.8 유지 확정');
  });
});
