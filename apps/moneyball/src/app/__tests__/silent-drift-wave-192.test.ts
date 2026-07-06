import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 192 — v2.0 "재조정 결정 대기" stale → v1.8 유지 확정 정합 (Fable plan 2026-07-06 최종진단)', () => {
  it('v2-shadow-monitor/page.tsx: metadata description v1.8 유지 확정 반영', () => {
    const src = readFileSync(join(ROOT, 'src/app/v2-shadow-monitor/page.tsx'), 'utf8');
    expect(src).not.toMatch(/v2\.0 재조정 결정 대기/);
    expect(src).toMatch(/v2\.1-B rejected \(Brier 0\.4635\), v1\.8 유지 확정/);
  });

  it('v2-shadow-monitor/page.tsx: JSON-LD description v1.8 유지 확정 반영', () => {
    const src = readFileSync(join(ROOT, 'src/app/v2-shadow-monitor/page.tsx'), 'utf8');
    expect(src).not.toMatch(/v2\.1-B rejected, v2\.0 재조정 결정 대기/);
    expect(src).toMatch(/v2\.1-B rejected, v1\.8 유지 확정/);
  });

  it('v2-shadow-monitor/page.tsx: body v1.8 유지 확정 반영', () => {
    const src = readFileSync(join(ROOT, 'src/app/v2-shadow-monitor/page.tsx'), 'utf8');
    expect(src).not.toMatch(/v2\.0 재조정 결정 대기 중/);
    expect(src).toMatch(/v2\.1-B rejected \(Brier 0\.4635\), v1\.8 유지 확정/);
  });

  it('methodology/page.tsx: version label v1.8 유지 확정 반영', () => {
    const src = readFileSync(join(ROOT, 'src/app/methodology/page.tsx'), 'utf8');
    expect(src).not.toMatch(/v2\.0 \(재조정 대기, v2\.1-B rejected\)/);
    expect(src).toMatch(/v2\.0 \(v2\.1-B rejected — v1\.8 유지 확정\)/);
  });

  it('methodology/page.tsx: change 텍스트 calibration 정상 근거 반영', () => {
    const src = readFileSync(join(ROOT, 'src/app/methodology/page.tsx'), 'utf8');
    expect(src).not.toMatch(/전면 가중치 재조정 결정 대기 중/);
    expect(src).toMatch(/home_win_prob Brier 0\.24.*calibration 정상/);
    expect(src).toMatch(/v1\.8 유지 확정/);
  });

  it('accuracy/shadow/page.tsx: v1.8 유지 확정 반영', () => {
    const src = readFileSync(join(ROOT, 'src/app/accuracy/shadow/page.tsx'), 'utf8');
    expect(src).not.toMatch(/v2\.0 재조정 결정 대기/);
    expect(src).not.toMatch(/v2\.0 결정 대기/);
    expect(src).toMatch(/v1\.8 유지 확정/);
  });

  it('about/page.tsx: v1.8 유지 확정 반영', () => {
    const src = readFileSync(join(ROOT, 'src/app/about/page.tsx'), 'utf8');
    expect(src).not.toMatch(/v2\.0 재조정 결정 대기 중/);
    expect(src).toMatch(/v2\.1-B rejected, v1\.8 유지 확정/);
  });

  it('v2-preview/page.tsx: v1.8 유지 확정 반영', () => {
    const src = readFileSync(join(ROOT, 'src/app/v2-preview/page.tsx'), 'utf8');
    expect(src).not.toMatch(/v2\.0 결정 대기/);
    expect(src).toMatch(/v2\.1-B rejected.*v1\.8 유지 확정/);
  });
});
