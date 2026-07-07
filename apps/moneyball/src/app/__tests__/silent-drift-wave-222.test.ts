import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');
const MODULES = readFileSync(join(REPO_ROOT, 'memory/implemented-modules.md'), 'utf8');
const CHANGELOG = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');

describe('silent drift wave 222 — memory/implemented-modules.md + CHANGELOG stale v2.0 forward claims 정합 (cycle 1505)', () => {
  it('memory/implemented-modules.md: v0.5.40 accuracy 누적 검증 "n=150 도달 추정 06월 말~07월 초" stale annotation 박제', () => {
    expect(MODULES).toMatch(/n=150 도달 추정 06월 말~07월 초.*← stale.*cycle 1447.*n=161.*cycle 1460.*v1\.8 유지 확정/);
  });

  it('memory/implemented-modules.md: 015_games_weather.sql "v2.0 날씨 팩터 연구 source" stale annotation 박제', () => {
    expect(MODULES).toMatch(/~~v2\.0 날씨 팩터 연구 source\.~~.*← stale.*cycle 1460 v1\.8 유지 확정.*v2\.0 upgrade 불필요.*미채택/);
  });

  it('memory/implemented-modules.md: 016_pitcher_stats_snapshots.sql "v2.0 튜닝 구조적 제약 해소" stale annotation 박제', () => {
    expect(MODULES).toMatch(/~~v2\.0 튜닝 구조적 제약 해소\.~~.*← stale.*cycle 1460 v1\.8 유지 확정.*v2\.0 튜닝 자체 불필요/);
  });

  it('CHANGELOG: W22 "가중치 조정 보류 (n=150 미달, 잔여 23건)" stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/가중치 조정.*보류.*n=150 미달, 잔여 23건.*← stale.*n=178 달성.*v1\.8 유지 확정.*cycle 1460/);
  });

  it('CHANGELOG: W22 "잔여 23경기 → v2.0 임계 n=150" ETA stale annotation 박제', () => {
    expect(CHANGELOG).toMatch(/잔여 23경기.*v2\.0 임계 n=150.*ETA.*4\.6일.*velocity.*5\/day.*← stale.*n=178 달성.*cycle 1447.*v1\.8 유지 확정/);
  });
});
