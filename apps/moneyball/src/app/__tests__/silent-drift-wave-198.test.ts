import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

describe('silent drift wave 198 — scripts/ v2.0 upgrade stale claims → v1.8 유지 확정 정합 (cycle 1465)', () => {
  it('scripts/backtest-v2-candidate.ts: "n=150 forward cohort 측정 후 production 적용 결정" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'scripts/backtest-v2-candidate.ts'), 'utf8');
    expect(src).not.toMatch(/n=150 forward cohort 측정 후 production 적용 결정/);
  });

  it('scripts/backtest-v2-candidate.ts: "v2.0 후보 weights 재설계 input" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'scripts/backtest-v2-candidate.ts'), 'utf8');
    expect(src).not.toMatch(/v2\.0 후보 weights 재설계 input/);
  });

  it('scripts/backtest-v2-candidate.ts: v1.8 유지 확정 최종 결정 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'scripts/backtest-v2-candidate.ts'), 'utf8');
    expect(src).toMatch(/v1\.8 유지 확정/);
    expect(src).toMatch(/cycle 1460/);
    expect(src).toMatch(/최대 차이 0\.15% < 1pp/);
  });

  it('scripts/backtest-v2-candidate.ts: plan #16 archive 상태 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'scripts/backtest-v2-candidate.ts'), 'utf8');
    expect(src).toMatch(/plan #16 archive/);
  });

  it('scripts/measure-context-layer-brier.ts: "n=150 도달 ETA 2026-07-02" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'scripts/measure-context-layer-brier.ts'), 'utf8');
    expect(src).not.toMatch(/n=150 도달 ETA/);
  });

  it('scripts/measure-context-layer-brier.ts: 표본 부족 경고 문구 유지', () => {
    const src = readFileSync(join(REPO_ROOT, 'scripts/measure-context-layer-brier.ts'), 'utf8');
    expect(src).toMatch(/자정 verify cron 누적 후 후속 cycle 재실행 권장/);
  });
});
