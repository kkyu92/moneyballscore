import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

describe('silent drift wave 214 — decisions/lessons/research stale n=150 ETA → v1.8 유지 확정 정합 (cycle 1487)', () => {
  it('docs/decisions/mlb-vs-kbo-priority.md: "n=150 forward cohort wait" line stale annotation 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/decisions/mlb-vs-kbo-priority.md'), 'utf8');
    expect(src).toMatch(/n=150 forward cohort wait.*← stale.*n=178 crossed/);
  });

  it('docs/decisions/mlb-vs-kbo-priority.md: 비교 표 "n=150 ETA 2026-08-04" stale annotation 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/decisions/mlb-vs-kbo-priority.md'), 'utf8');
    expect(src).toMatch(/n=150 ETA 2026-08-04.*← stale.*cycle 1460/);
  });

  it('docs/lessons/2026-05-08-sfr-extremes-override-pattern.md: "가중치 변경은 n=150 도달 후 예정" stale annotation 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/lessons/2026-05-08-sfr-extremes-override-pattern.md'), 'utf8');
    expect(src).toMatch(/가중치 변경은 n=150 도달 후 예정.*← stale.*v1\.8 유지 확정/);
  });

  it('docs/research/tabpfn-data-prep.md: Step 5 "gating v1.8 cohort n=150" stale annotation 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/research/tabpfn-data-prep.md'), 'utf8');
    expect(src).toMatch(/v2\.0.*upgrade 불필요.*cycle 1460.*v1\.8 유지 확정.*Step 5 소멸/);
  });

  it('docs/research/tabpfn-data-prep.md: "n=150 ETA" ref section stale annotation 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/research/tabpfn-data-prep.md'), 'utf8');
    expect(src).toMatch(/n=150 ETA.*cycle 949.*← stale.*n=178 crossed/);
  });
});
