import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

describe('silent drift wave 212 — CHANGELOG + decisions + lessons stale v2.0/n=150 forward framing → v1.8 유지 확정 정합 (cycle 1486)', () => {
  it('CHANGELOG.md: "n=150 도달 전까지 양쪽 병행 추적 필요" stale annotation 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    expect(src).toMatch(/n=150 도달 전까지 양쪽 병행 추적 필요.*← stale.*cycle 1460/);
  });

  it('CHANGELOG.md: "n=150 도달 시 heavy 재실행" stale annotation 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    expect(src).toMatch(/n=150 도달 시 heavy 재실행.*← stale.*cycle 1460/);
  });

  it('CHANGELOG.md: "v2.0 트리거는 n=150 도달 시" stale annotation 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    expect(src).toMatch(/v2\.0 트리거는 n=150 도달 시.*← stale.*cycle 1460/);
  });

  it('CHANGELOG.md: 팩터분석 "n=150 도달 전까지 방향 신호" stale annotation 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    expect(src).toMatch(/n=150 도달 전까지.*방향 신호.*← stale.*cycle 1460/);
  });

  it('docs/decisions/statcast-factor-13-scope.md: 보류 옵션 "n=150 도달 후 결정" stale annotation 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/decisions/statcast-factor-13-scope.md'), 'utf8');
    expect(src).toMatch(/n=150 도달 후 결정.*← stale.*cycle 1460/);
  });

  it('docs/decisions/statcast-factor-13-scope.md: "n=150 도달 후 v2.0 가중치 결정 시점에 재검토" stale annotation 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/decisions/statcast-factor-13-scope.md'), 'utf8');
    expect(src).toMatch(/n=150 도달 후 v2\.0 가중치 결정 시점에 재검토.*← stale/);
  });

  it('docs/decisions/feature-flag-poc-scope.md: v2.0 ship 결정 시점 rollout stale annotation 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/decisions/feature-flag-poc-scope.md'), 'utf8');
    expect(src).toMatch(/v2\.0 ship 결정 시점.*rollout protocol fire.*← stale/);
  });

  it('docs/decisions/feature-flag-poc-scope.md: "n=150 ETA 2026-08-04" stale annotation 박제', () => {
    const src = readFileSync(join(REPO_ROOT, 'docs/decisions/feature-flag-poc-scope.md'), 'utf8');
    expect(src).toMatch(/n=150 ETA 2026-08-04.*← stale/);
  });

  it('docs/lessons/2026-05-13-confidence-inversion-calibration-signal.md: ECE calibration stale annotation 박제', () => {
    const src = readFileSync(
      join(REPO_ROOT, 'docs/lessons/2026-05-13-confidence-inversion-calibration-signal.md'),
      'utf8'
    );
    expect(src).toMatch(/n=150 도달.*calibration.*← stale.*cycle 1460/);
    expect(src).toMatch(/Platt scaling 불필요 결론/);
  });

  it('docs/lessons/2026-05-18-cycle-606-v2-baseline-measurement.md: Step C stale annotation 박제', () => {
    const src = readFileSync(
      join(REPO_ROOT, 'docs/lessons/2026-05-18-cycle-606-v2-baseline-measurement.md'),
      'utf8'
    );
    expect(src).toMatch(/Step C.*n=150 도달 시.*← stale.*cycle 1460/);
  });
});
