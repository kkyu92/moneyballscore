import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

describe('silent drift wave 196 — TODOS.md + memory/implemented-modules.md v2.0 트래킹 stale → v1.8 유지 확정 정합 (cycle 1463)', () => {
  it('TODOS.md: "cycle 1098 갱신" stale 제거 (cycle 1460 최종 갱신으로 대체)', () => {
    const src = readFileSync(join(REPO_ROOT, 'TODOS.md'), 'utf8');
    expect(src).not.toMatch(/모델 v2\.0 업그레이드 트래킹.*cycle 1098 갱신/);
  });

  it('TODOS.md: v1.8 유지 확정 결정 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'TODOS.md'), 'utf8');
    expect(src).toMatch(/최종 결정 \(2026-07-06, cycle 1460\)/);
    expect(src).toMatch(/v1\.8 유지 확정/);
  });

  it('TODOS.md: "v2.0 임계 n=150 까지.*잔여 74건" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'TODOS.md'), 'utf8');
    expect(src).not.toMatch(/v2\.0 임계 n=150 까지 \(v1\.8 real 기준\) \*\*잔여 74건\*\*/);
  });

  it('TODOS.md: v2.1-B rejected 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'TODOS.md'), 'utf8');
    expect(src).toMatch(/v2\.1-B \*\*rejected\*\*/);
  });

  it('TODOS.md: n=178 임계 달성 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'TODOS.md'), 'utf8');
    expect(src).toMatch(/n=178 임계 달성/);
  });

  it('TODOS.md: cycle 354 op-analysis lite "n=150 도달 후 heavy 재실행" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'TODOS.md'), 'utf8');
    expect(src).not.toMatch(/v1\.8 시작: 2026-05-13[^\n]*n=150 도달 후 heavy 재실행\.\s*$/m);
  });

  it('TODOS.md: cycle 1460 재입증 완료 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'TODOS.md'), 'utf8');
    expect(src).toMatch(/cycle 1460 재입증 완료/);
  });

  it('memory/implemented-modules.md: "cycle 886 갱신.*n=150 까지 17건" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'memory/implemented-modules.md'), 'utf8');
    expect(src).not.toMatch(/v2\.0 임계 n=150 까지 17건/);
  });

  it('memory/implemented-modules.md: cycle 1460 plan #16 2차 fire 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'memory/implemented-modules.md'), 'utf8');
    expect(src).toMatch(/cycle 1460 plan #16 2차 fire/);
    expect(src).toMatch(/v1\.8 유지 확정 \(cycle 1460\)/);
  });

  it('memory/implemented-modules.md: n=178 60.9% Brier 0.2443 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'memory/implemented-modules.md'), 'utf8');
    expect(src).toMatch(/n=178 60\.9% accuracy, Brier 0\.2443/);
  });

  it('dashboard/page.tsx: "모델 v2.0 튜닝 진단" heading stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'apps/moneyball/src/app/dashboard/page.tsx'), 'utf8');
    expect(src).not.toMatch(/모델 v2\.0 튜닝 진단/);
  });

  it('dashboard/page.tsx: 팩터 정확도 진단 + v1.8 유지 확정 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'apps/moneyball/src/app/dashboard/page.tsx'), 'utf8');
    expect(src).toMatch(/팩터 정확도 진단/);
    expect(src).toMatch(/v1\.8 유지 확정/);
  });

  it('ModelTuningInsights.tsx: "v2.0 가중치 제안" 활성화 문구 stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'apps/moneyball/src/components/dashboard/ModelTuningInsights.tsx'), 'utf8');
    expect(src).not.toMatch(/v2\.0 가중치 제안은.*경기 이상에서 활성화/);
    expect(src).not.toMatch(/모델 v2\.0 튜닝 후보/);
  });

  it('ModelTuningInsights.tsx: v1.8 확정 후 역사 참고 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'apps/moneyball/src/components/dashboard/ModelTuningInsights.tsx'), 'utf8');
    expect(src).toMatch(/v1\.8 확정 후 역사 참고/);
  });
});
