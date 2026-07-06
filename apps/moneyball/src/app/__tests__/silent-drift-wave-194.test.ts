import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '../../../../..');

describe('silent drift wave 194 — CLAUDE.md v2.0 calibration stale → v1.8 유지 확정 + n=178 정합 (cycle 1461)', () => {
  it('CLAUDE.md: "n=150 임계 달성 후 전면 재조정" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
    expect(src).not.toMatch(/n=150 임계.*달성 후 전면 재조정/);
  });

  it('CLAUDE.md: "56건 부족" stale 제거 (cycle 495 오래된 측정)', () => {
    const src = readFileSync(join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
    expect(src).not.toMatch(/56건 부족/);
  });

  it('CLAUDE.md: "Brier v1.8 0.4335 winner-centric" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
    expect(src).not.toMatch(/Brier v1\.8 0\.4335/);
  });

  it('CLAUDE.md: "n=126 total / real n=94" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
    expect(src).not.toMatch(/n=126 total \/ real n=94/);
  });

  it('CLAUDE.md: "n=150 도달 추정 2026-08-04" stale 제거', () => {
    const src = readFileSync(join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
    expect(src).not.toMatch(/n=150 도달 추정 2026-08-04/);
  });

  it('CLAUDE.md: v2.0 결정 완료 + v1.8 유지 확정 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
    expect(src).toMatch(/v2\.0 결정 완료/);
    expect(src).toMatch(/v1\.8 유지 확정/);
  });

  it('CLAUDE.md: n=178 임계 달성 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
    expect(src).toMatch(/n=178 임계 달성/);
  });

  it('CLAUDE.md: Brier 0.2443 최신 측정값 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
    expect(src).toMatch(/Brier 0\.2443/);
  });

  it('CLAUDE.md: CREDIT_EXHAUSTED 2026-06-06 측정 오류 원인 반영', () => {
    const src = readFileSync(join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
    expect(src).toMatch(/CREDIT_EXHAUSTED/);
    expect(src).toMatch(/측정 오류/);
  });
});
