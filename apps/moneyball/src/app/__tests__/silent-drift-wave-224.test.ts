import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');
const LESSONS_ROOT = join(REPO_ROOT, 'docs/lessons');

const DOWNTURN = readFileSync(join(LESSONS_ROOT, '2026-05-16-v18-first-week-downturn-noise.md'), 'utf8');
const CREDIT = readFileSync(join(LESSONS_ROOT, '2026-05-14-anthropic-credit-silent-fallback-v18.md'), 'utf8');
const W22SAT = readFileSync(join(LESSONS_ROOT, '2026-05-17-w22-saturday-recovery.md'), 'utf8');
const CYCLE835 = readFileSync(join(LESSONS_ROOT, '2026-05-21-cycle-835-todos-stale-vs-claudemd-drift.md'), 'utf8');

describe('silent drift wave 224 — docs/lessons historic stale v2.0 forward claims 정합 (cycle 1507)', () => {
  it('v18-first-week-downturn: "v2.0 임계 n=150 까지 41건" stale annotation 박제', () => {
    expect(DOWNTURN).toMatch(/~~v2\.0 임계 n=150 까지 41건.*재평가~~.*← stale.*cycle 1460.*n=178 도달.*v1\.8 유지 확정/);
  });

  it('credit-silent-fallback: "n=150+ 도달 후 op-analysis heavy ... 권장" stale annotation 박제', () => {
    expect(CREDIT).toMatch(/~~n=150\+ 도달 후 op-analysis heavy.*backtest 권장\.~~.*← stale.*cycle 1460.*v1\.8 유지 확정/);
  });

  it('w22-saturday-recovery: "v2.0 임계 n=150 까지 36건" stale annotation 박제', () => {
    expect(W22SAT).toMatch(/~~\*\*v2\.0 임계 n=150 까지 36건\*\*.*도달 가능~~.*← stale.*cycle 1460.*v1\.8 유지 확정/);
  });

  it('w22-saturday-recovery: "v2.0 임계 n=150 — W23~W24 재평가 trigger" stale annotation 박제', () => {
    expect(W22SAT).toMatch(/~~v2\.0 임계 n=150.*재평가 trigger~~.*← stale.*cycle 1460.*재평가 완료.*v1\.8 유지 확정/);
  });

  it('cycle-835-todos-stale: "n=150 도달 시 operational-analysis heavy" stale annotation 박제', () => {
    expect(CYCLE835).toMatch(/~~\*\*n=150 도달 시.*operational-analysis.*heavy.*backtest harness 실행~~.*← stale.*cycle 1460.*v1\.8 유지 확정/);
  });
});
