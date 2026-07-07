import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');
const CHANGELOG = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');

describe('silent drift wave 219 — CHANGELOG stale n=150 forward claims → v1.8 유지 확정 정합 (cycle 1502)', () => {
  it('CHANGELOG: "n=150 이전 판단 유보" W20 h2h 분석 stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/n=150 이전 판단 유보.*← stale.*n=178 도달.*cycle 1447/);
  });

  it('CHANGELOG: "n=150 후 팀별 보정 검토 트리거" W22 키움 분석 stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/n=150 후 팀별 보정 검토 트리거.*← stale.*n=178 도달.*cycle 1447/);
  });

  it('CHANGELOG: "n=150 이후 팀별 보정 검토" 키움(WO) 분석 stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/n=150 이후 팀별 보정 검토.*← stale.*n=178 도달.*cycle 1447/);
  });

  it('CHANGELOG: "n=94 (v2.0 임계 n=150까지 56건)" v1.8 첫날 stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/v1\.8 0건.*n=94.*n=150까지 56건.*← stale.*n=178 도달/);
  });

  it('CHANGELOG: "Sunday cap 추가 조치 검토 필요 (n=150 이후)" stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/Sunday cap.*n=150 이후.*← stale.*n=178 도달.*cycle 1447/);
  });

  it('CHANGELOG: "v1.8 적용 직후 n=94 (n=150까지 56건 부족)" 가중치 조정 결정 stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/v1\.8.*적용 직후.*n=94.*n=150까지 56건 부족.*← stale.*n=178 도달/);
  });

  it('CHANGELOG: "즉각 변경 없음 n=94 (n=150까지 56건 부족)" stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/즉각 변경 없음.*n=94.*n=150까지 56건 부족.*← stale.*n=178 도달/);
  });

  it('CHANGELOG: "lineup_woba 15%→17% 상향 검토 (n=150 이후)" stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/lineup_woba.*n=150 이후.*← stale.*n=178 도달.*cycle 1447/);
  });

  it('CHANGELOG: "n=89 (목표 150)" stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/n=89.*목표 150.*← stale.*n=178 도달/);
  });

  it('CHANGELOG: "head_to_head n=150 도달 시 즉시 적용" stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/head_to_head.*n=150 도달 시 즉시 적용.*← stale.*n=178 도달/);
  });
});
