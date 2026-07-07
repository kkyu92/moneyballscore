import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

describe('silent drift wave 209 — docs stale v2.0-upgrade gating claims → v1.8 유지 확정 정합 (cycle 1482)', () => {
  it('docs/research/tabpfn-feasibility.md: 배경 섹션 SUPERSEDED callout 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/research/tabpfn-feasibility.md'), 'utf8');
    expect(src).toMatch(/SUPERSEDED \(2026-07-06 cycle 1460\)/);
    expect(src).toMatch(/v1\.8 유지 확정/);
    expect(src).toMatch(/n=178 도달 \(cycle 1447\)/);
  });

  it('docs/research/tabpfn-feasibility.md: gating 활성 tense stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/research/tabpfn-feasibility.md'), 'utf8');
    expect(src).not.toMatch(/^- \*\*gating\*\*: v1\.8 cohort `n=150`.*후 v2\.0 결정 시점\.$/m);
  });

  it('docs/design/decision-tree-viz-2026-07-03.md: status SUPERSEDED 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/design/decision-tree-viz-2026-07-03.md'), 'utf8');
    expect(src).toMatch(/status: SUPERSEDED \(2026-07-06 cycle 1460\)/);
    expect(src).toMatch(/소진된 카드/);
  });

  it('docs/design/decision-tree-viz-2026-07-03.md: "v2.0 가중치 조정 근거" 활성 claim 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/design/decision-tree-viz-2026-07-03.md'), 'utf8');
    expect(src).not.toMatch(/→ v2\.0 가중치 조정 근거 1개 추가/);
  });

  it('docs/decisions/statcast-factor-13-scope.md: 캘린더 trigger callout 역사 기록 tense', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/decisions/statcast-factor-13-scope.md'), 'utf8');
    expect(src).toMatch(/캘린더 trigger 역사 기록/);
    expect(src).toMatch(/ESCALATED status 박제 완료/);
    expect(src).toMatch(/v1\.8 유지 확정 \(cycle 1460\)/);
  });

  it('docs/decisions/statcast-factor-13-scope.md: 미결정 시 자동 escalation future-tense stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/decisions/statcast-factor-13-scope.md'), 'utf8');
    expect(src).not.toMatch(/본 날짜까지 미결정 시 자동 escalation \(carry-over plan 박제 \+ 사용자 알림\)\.$/m);
  });
});
