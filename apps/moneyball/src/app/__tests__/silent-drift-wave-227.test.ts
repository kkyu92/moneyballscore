import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

const TODOS = readFileSync(join(REPO_ROOT, 'TODOS.md'), 'utf8');
const RETRO_V0549 = readFileSync(
  join(REPO_ROOT, 'docs/retros/2026-06-30-v0.5.49.2.md'),
  'utf8'
);
const SPEC_1383 = readFileSync(
  join(
    REPO_ROOT,
    'docs/superpowers/specs/2026-06-25-cycle-1383-explore-idea-post-wave-152-saturation-redirect.md'
  ),
  'utf8'
);

describe('silent drift wave 227 — TODOS + retro + spec stale v2.0 forward claims 정합 (cycle 1526)', () => {
  it('TODOS.md: "n=150+ 도달 후 최종 확정 권장" stale annotation 박제', () => {
    expect(TODOS).toMatch(
      /n=150\+ 도달 후 최종 확정 권장.*← stale.*cycle 1460.*n=178 재입증.*v1\.8 유지 확정/
    );
  });

  it('TODOS.md: "SFR 극단값 대응 후보 (n=150+ 도달 후, cycle 256 신규)" stale annotation 박제', () => {
    expect(TODOS).toMatch(
      /n=150\+ 도달 후, cycle 256 신규.*← stale.*cycle 1460.*v1\.8 유지 확정/
    );
  });

  it('docs/retros/2026-06-30-v0.5.49.2.md: "n=150 도달 후 전 팀 체계 측정" stale annotation 박제', () => {
    expect(RETRO_V0549).toMatch(
      /n=150 도달 후 전 팀 체계 측정.*← stale.*cycle 1460.*v1\.8 유지 확정/
    );
  });

  it('docs/superpowers/specs/2026-06-25-cycle-1383-*.md: ⚠️ STALE header 박제', () => {
    expect(SPEC_1383).toMatch(/⚠️ STALE.*cycle 1460.*v1\.8 유지 확정/);
  });
});
