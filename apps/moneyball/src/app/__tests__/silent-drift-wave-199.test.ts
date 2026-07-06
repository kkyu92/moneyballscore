import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

describe('silent drift wave 199 — docs/research+decisions v2.0 ACTIVE status stale → SUPERSEDED/ESCALATED 정합 (cycle 1466)', () => {
  it('docs/research/v2.0-killswitch.md: Status ACTIVE stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/research/v2.0-killswitch.md'), 'utf8');
    expect(src).not.toMatch(/^\*\*Status\*\*: ACTIVE/m);
  });

  it('docs/research/v2.0-killswitch.md: SUPERSEDED 상태 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/research/v2.0-killswitch.md'), 'utf8');
    expect(src).toMatch(/SUPERSEDED/);
    expect(src).toMatch(/v1\.8 유지 확정/);
    expect(src).toMatch(/cycle 1460/);
  });

  it('docs/decisions/feature-flag-poc-scope.md: "pending user decision" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/decisions/feature-flag-poc-scope.md'), 'utf8');
    expect(src).not.toMatch(/^\*\*Status\*\*: pending user decision/m);
  });

  it('docs/decisions/feature-flag-poc-scope.md: SUPERSEDED 상태 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/decisions/feature-flag-poc-scope.md'), 'utf8');
    expect(src).toMatch(/SUPERSEDED/);
    expect(src).toMatch(/v1\.8 유지 확정/);
  });

  it('docs/decisions/statcast-factor-13-scope.md: "pending user decision" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/decisions/statcast-factor-13-scope.md'), 'utf8');
    expect(src).not.toMatch(/^\*\*Status\*\*: pending user decision/m);
  });

  it('docs/decisions/statcast-factor-13-scope.md: ESCALATED 상태 반영 (deadline 2026-06-30 경과)', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/decisions/statcast-factor-13-scope.md'), 'utf8');
    expect(src).toMatch(/ESCALATED/);
    expect(src).toMatch(/2026-06-30/);
  });
});
