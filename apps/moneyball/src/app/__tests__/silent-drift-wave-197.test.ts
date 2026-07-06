import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

describe('silent drift wave 197 — CHANGELOG.md v1.8 유지 확정 milestone entry 부재 → cycle 1447/1450/1460 정합 (cycle 1464)', () => {
  it('CHANGELOG.md: v1.8 유지 확정 결정 milestone entry 존재', () => {
    const src = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    expect(src).toMatch(/v1\.8 유지 확정 결정 — n=178 임계 달성/);
  });

  it('CHANGELOG.md: cycle 1447/1450/1460 3 milestone 순차 도달 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    expect(src).toMatch(/cycle 1447.*n=161 첫 crossing/);
    expect(src).toMatch(/cycle 1450.*51th skill-evolution milestone/);
    expect(src).toMatch(/cycle 1460.*v1\.8 유지 확정 최종 결정/);
  });

  it('CHANGELOG.md: v2.1-B rejected 근거 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    expect(src).toMatch(/v2\.1-B rejected 근거/);
    expect(src).toMatch(/N=52 소표본/);
    expect(src).toMatch(/Brier 0\.4635/);
  });

  it('CHANGELOG.md: waves 186~196 정합 sweep 11 wave 표 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    expect(src).toMatch(/정합 sweep \(waves 186~196/);
    expect(src).toMatch(/\| 186 \| 1459 \|/);
    expect(src).toMatch(/\| 196 \| 1463 \|/);
  });

  it('CHANGELOG.md: Brier DEFAULT vs Learned 0.15% delta 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    expect(src).toMatch(/Brier DEFAULT 0\.2443 vs Learned 0\.2458/);
    expect(src).toMatch(/최대 차이 0\.15% < 1pp 임계/);
  });

  it('CHANGELOG.md: 최상단 milestone entry 이후 cycle 1422 패턴 추출 entry 유지', () => {
    const src = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    const milestoneIdx = src.indexOf('v1.8 유지 확정 결정');
    const cycle1422Idx = src.indexOf('패턴 추출 — cycle 1422');
    expect(milestoneIdx).toBeGreaterThan(0);
    expect(cycle1422Idx).toBeGreaterThan(milestoneIdx);
  });
});
