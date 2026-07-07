import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');
const CHANGELOG = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');

describe('silent drift wave 221 — CHANGELOG stale v2.0 upgrade countdown/plan 정합 (cycle 1504)', () => {
  it('CHANGELOG: W22 v2.0 n=150 카운트다운 "n=150까지 36건" stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/v2\.0 임계 n=150 까지 36건.*← stale.*n=178 도달.*cycle 1447.*v1\.8 유지 확정/);
  });

  it('CHANGELOG: W22 v2.0 n=150 카운트다운 "n=150까지 41건" stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/v2\.0 임계 n=150 까지 41건.*← stale.*n=178 도달.*cycle 1447.*v1\.8 유지 확정/);
  });

  it('CHANGELOG: v1.8 W22 가중치 결정 "v2.0 시 SFR 하향 후보 강화" stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/v2\.0 시 하향 후보 강화.*← stale.*n=178 도달.*cycle 1447.*v1\.8 유지 확정.*v2\.0 재조정 불필요/);
  });

  it('CHANGELOG: v1.8 W22 가중치 결정 "v2.0 계획 데이터 지지" stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/v2\.0 계획 데이터 지지.*← stale.*n=178 도달.*cycle 1447.*v1\.8 유지 확정/);
  });

  it('CHANGELOG: W20 op-analysis 가중치 보류 "n=89 target n=150" stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/target n=150\)[\s\S]*?소표본 경고 유효[\s\S]*?← stale.*n=178 도달.*cycle 1447.*v1\.8 유지 확정/);
  });

  it('CHANGELOG: W20 op-analysis "Sunday confidence_clamp n=150 전 검토" stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/Sunday confidence_clamp.*n=150 전 단독 적용 검토.*← stale.*Sunday cap.*0\.55 이미 적용/);
  });

  it('CHANGELOG: W20 v2.0 진행 상황 "누적 89건 목표 n=150+" stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/누적 89건.*목표 n=150\+.*잔여 61건.*← stale.*n=178 도달.*cycle 1447.*v1\.8 유지 확정/);
  });

  it('CHANGELOG: W20 SFR action "n=150 도달 후 SFR 재검토" stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/n=150 도달 후 heavy 분석 시 SFR 임계값[\s\S]*?← stale.*n=178 도달.*cycle 1447.*v1\.8 유지 확정.*SFR 재검토 불필요/);
  });
});
