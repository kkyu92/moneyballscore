/**
 * wave-247 regression guard — methodology page 하드코딩 n=X 재발 차단.
 *
 * Root cause (cycle 1549 축 C 진단): n=178 (cycle 1460 스냅샷) / n=165 (cycle 1545 스냅샷) /
 *   n=187 (cycle 1549 실측 v1.8 only) = 각각 시점별 자연 snapshot. 표본 미스매치 X.
 *   그러나 methodology page 하드코딩 방식 자체가 매 사이클 stale drift 재발 root.
 *
 * fix: 하드코딩 n=X 제거, "n=150+ 임계 도달 이후 v1.8 유지 확정" 라벨 + /accuracy 실시간 참조.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(__dirname, '../../../../..');
const METHODOLOGY_SRC = readFileSync(
  join(REPO_ROOT, 'apps/moneyball/src/app/methodology/page.tsx'),
  'utf-8',
);

describe('wave-247: methodology page 하드코딩 n=X 제거', () => {
  it('"누적 표본 n=NNN" 하드코딩 사라짐 (매 사이클 stale drift 재발 root)', () => {
    // 누적 표본 count 는 실시간이므로 하드코딩 금지.
    // n=52 (v2.1-B rejected evidence) 등 historical snapshot 은 별개 컨텍스트로 허용.
    expect(METHODOLOGY_SRC).not.toMatch(/누적 표본 n=\d+/);
    expect(METHODOLOGY_SRC).not.toMatch(/n=165 \(DB 실측\)/);
    expect(METHODOLOGY_SRC).not.toMatch(/n=178 verified pre_game/);
    expect(METHODOLOGY_SRC).not.toMatch(/n=187/);
  });
  it('n=150+ 임계 라벨 present', () => {
    expect(METHODOLOGY_SRC).toContain('n=150+');
  });
  it('/accuracy 실시간 참조 present', () => {
    expect(METHODOLOGY_SRC).toContain('/accuracy');
  });
  it('v1.8 유지 확정 label preserved', () => {
    expect(METHODOLOGY_SRC).toContain('v1.8 유지 확정');
  });
});
