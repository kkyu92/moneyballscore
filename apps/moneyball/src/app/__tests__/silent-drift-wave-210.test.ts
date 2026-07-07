import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

describe('silent drift wave 210 — CHANGELOG + mlb-vs-kbo-priority stale v2.0 forward cohort framing → v1.8 유지 확정 정합 (cycle 1483)', () => {
  it('docs/decisions/mlb-vs-kbo-priority.md: v1.8 유지 확정 callout 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/decisions/mlb-vs-kbo-priority.md'), 'utf8');
    expect(src).toMatch(/v1\.8 유지 확정/);
    expect(src).toMatch(/cycle 1460/);
    expect(src).toMatch(/n=178 도달/);
  });

  it('docs/decisions/mlb-vs-kbo-priority.md: "진행 중" + "n=150 wait (ETA 2026-08-04)" 활성 claim 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/decisions/mlb-vs-kbo-priority.md'), 'utf8');
    expect(src).not.toMatch(/\| v1\.8 → v2\.0 cohort 박제 \| 진행 중/);
    expect(src).not.toMatch(/n=150 wait \(ETA 2026-08-04\)/);
  });

  it('CHANGELOG.md: W21 section "미완료 (n=150 도달 후)" 활성 section header stale 정합', () => {
    const src = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    expect(src).toMatch(/~~미완료 \(n=150 도달 후\)~~ — 완료: v1\.8 유지 확정 \(cycle 1460\)/);
  });

  it('CHANGELOG.md: "n=150 도달 후 v2.0 확정" 활성 claim 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    expect(src).not.toMatch(/n=150 도달 후 v2\.0 확정\./);
  });

  it('CHANGELOG.md: "n=150 도달 시 operational-analysis heavy 재실행 예정" 활성 claim 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    expect(src).not.toMatch(/n=150 도달 시 operational-analysis heavy 재실행 예정\./);
  });

  it('CHANGELOG.md: "calibration curve re-fit 필요 (n=150 도달 후)" 활성 claim 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    expect(src).not.toMatch(/calibration curve re-fit 필요 \(n=150 도달 후\)\./);
  });

  it('CHANGELOG.md: "n=150 도달 후 judge-agent.ts 일요일 confidence clamp 조정 검토 예정" 활성 claim 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    expect(src).not.toMatch(/n=150 도달 후 `judge-agent\.ts` 일요일 confidence clamp 조정 검토 예정\./);
  });
});
