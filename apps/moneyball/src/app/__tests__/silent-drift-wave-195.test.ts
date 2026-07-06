import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

describe('silent drift wave 195 — packages/ src comments v2.0 결정 stale → v1.8 유지 확정 정합 (cycle 1462)', () => {
  it('packages/shared feature-flags.ts: "n=150 v1.8 cohort 측정 완료 후 활성 예정" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'packages/shared/src/feature-flags.ts'), 'utf8');
    expect(src).not.toMatch(/n=150 v1\.8 cohort 측정 완료 후 활성 예정/);
  });

  it('packages/shared feature-flags.ts: v1.8 유지 확정 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'packages/shared/src/feature-flags.ts'), 'utf8');
    expect(src).toMatch(/v1\.8 유지 확정/);
  });

  it('packages/shared model-version-labels.ts: "n=150 wait 시간 절반" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'packages/shared/src/model-version-labels.ts'), 'utf8');
    expect(src).not.toMatch(/n=150 wait 시간 절반/);
  });

  it('packages/shared model-version-labels.ts: "n=150 도달 시 v2.0 promotion 결정" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'packages/shared/src/model-version-labels.ts'), 'utf8');
    expect(src).not.toMatch(/n=150 도달 시 v2\.0 promotion 결정/);
  });

  it('packages/shared model-version-labels.ts: n=178 crossed 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'packages/shared/src/model-version-labels.ts'), 'utf8');
    expect(src).toMatch(/n=178 crossed/);
  });

  it('packages/shared index.ts: "n=150 도달 후 full v2.0.*재확정 예정" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'packages/shared/src/index.ts'), 'utf8');
    expect(src).not.toMatch(/n=150 도달 후 full v2\.0[^\n]*재확정 예정/);
  });

  it('packages/shared index.ts: SHADOW_WEIGHTS "n=150 도달 후 production 적용 결정" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'packages/shared/src/index.ts'), 'utf8');
    expect(src).not.toMatch(/n=150 도달 후 production 적용 결정/);
  });

  it('packages/shared index.ts: v2.1-B rejected 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'packages/shared/src/index.ts'), 'utf8');
    expect(src).toMatch(/v2\.1-B rejected/);
  });

  it('packages/kbo-data shadow-cohort.ts: "n=150 도달 후 production 적용 결정 evidence" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'packages/kbo-data/src/pipeline/shadow-cohort.ts'), 'utf8');
    expect(src).not.toMatch(/n=150 도달 후 production 적용 결정 evidence/);
  });

  it('packages/kbo-data shadow-cohort.ts: v2.1-B rejected 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'packages/kbo-data/src/pipeline/shadow-cohort.ts'), 'utf8');
    expect(src).toMatch(/v2\.1-B rejected/);
  });

  it('packages/kbo-data daily.ts: "n=150 v1.8 cohort 측정 완료 후 flag flip" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'packages/kbo-data/src/pipeline/daily.ts'), 'utf8');
    expect(src).not.toMatch(/n=150 v1\.8 cohort 측정 완료 후 flag flip/);
  });

  it('packages/kbo-data daily.ts: v1.8 유지 확정 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'packages/kbo-data/src/pipeline/daily.ts'), 'utf8');
    expect(src).toMatch(/v1\.8 유지 확정/);
  });

  it('packages/kbo-data backtest-v2-helpers.ts: "n=150 forward cohort 측정" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'packages/kbo-data/src/backtest/backtest-v2-helpers.ts'), 'utf8');
    expect(src).not.toMatch(/n=150 forward cohort 측정/);
  });

  it('packages/kbo-data backtest-v2-helpers.ts: 소진된 카드 evidence 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'packages/kbo-data/src/backtest/backtest-v2-helpers.ts'), 'utf8');
    expect(src).toMatch(/소진된 카드/);
  });
});
