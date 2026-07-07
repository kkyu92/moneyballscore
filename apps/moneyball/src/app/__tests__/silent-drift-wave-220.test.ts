import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');
const USER_GOAL_BASELINE = readFileSync(
  join(REPO_ROOT, 'docs/research/user-goal-impact-baseline.md'),
  'utf8',
);
const MODEL_VERSION_LABELS = readFileSync(
  join(REPO_ROOT, 'packages/shared/src/model-version-labels.ts'),
  'utf8',
);

describe('silent drift wave 220 — v2.0 promotion stale forward claims 정합 (cycle 1503)', () => {
  it('user-goal-impact-baseline: table row "#10 머니볼 Tier 2~4" 활성 fire trigger claim 제거 (~~ wrap + stale marker)', () => {
    expect(USER_GOAL_BASELINE).not.toMatch(/^\| #10 머니볼 Tier 2~4 \| v1\.8 n=150 도달 시점 fire \| 자연 누적 wait \|$/m);
  });

  it('user-goal-impact-baseline: table row "#10 머니볼 Tier 2~4" stale marker 박제 (cycle 1460 v1.8 유지 확정 정합)', () => {
    expect(USER_GOAL_BASELINE).toMatch(/#10 머니볼 Tier 2~4.*~~v1\.8 n=150 도달 시점 fire~~.*← stale.*cycle 1460.*v1\.8 유지 확정.*n=178 도달 cycle 1447.*fire trigger 소멸/);
  });

  it('user-goal-impact-baseline: table row "#10 머니볼 Tier 2~4" 비고 열 "fire 조건 소멸" 명시', () => {
    expect(USER_GOAL_BASELINE).toMatch(/자연 누적 wait \(fire 조건 소멸\)/);
  });

  it('model-version-labels: CURRENT_SCORING_RULE JSDoc "v2.0 promotion" stale annotation 박제', () => {
    expect(MODEL_VERSION_LABELS).toMatch(/v2\.0 promotion 시 본 상수 1개만.*← stale \(wave 220 cycle 1503\): v1\.8 유지 확정/s);
  });

  it('model-version-labels: PRODUCTION_ERA_HISTORY JSDoc "v2.0 promotion append" stale annotation 박제', () => {
    expect(MODEL_VERSION_LABELS).toMatch(/v2\.0 promotion 시 본 tuple 에 'v2\.0' append.*← stale \(wave 220 cycle 1503\): v1\.8 유지 확정 \(cycle 1460\), v2\.0 신규 prod era 박제 X\./s);
  });

  it('model-version-labels: LLM_DEBATE_VERSION comment "v2.1 bump" stale annotation 박제', () => {
    expect(MODEL_VERSION_LABELS).toMatch(/← stale \(wave 220 cycle 1503\): v2\.1 bump 계획 없음 — v1\.8 유지 확정 \(cycle 1460\)/);
  });
});
