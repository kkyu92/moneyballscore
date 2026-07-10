import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 190 — /accuracy/shadow + debug/model-comparison + Header v2.1-B 활성/누적 중 stale → v2.1-B rejected (Brier 0.4635) 정합', () => {
  it('accuracy/shadow/page.tsx: metadata description "도달 후 prod 적용 결정" 미래시제 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/accuracy/shadow/page.tsx'), 'utf8');
    expect(src).not.toMatch(/도달 후 prod 적용 결정/);
  });

  it('accuracy/shadow/page.tsx: metadata description 임계 초과 + v1.8 유지 확정 반영', () => {
    const src = readFileSync(join(ROOT, 'src/app/accuracy/shadow/page.tsx'), 'utf8');
    expect(src).toMatch(/임계 초과/);
    expect(src).toMatch(/v1\.8 유지 확정/);
  });

  it('accuracy/shadow/page.tsx: noindex 주석 "도달 후 production 적용 결정 전까지" 미래시제 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/accuracy/shadow/page.tsx'), 'utf8');
    expect(src).not.toMatch(/도달 후 production 적용 결정 전까지/);
  });

  it('accuracy/shadow/page.tsx: SHADOW_WEIGHTS 헤더 "활성"/"rejected Brier" 제거 + 사용자 친화 h2 반영', () => {
    const src = readFileSync(join(ROOT, 'src/app/accuracy/shadow/page.tsx'), 'utf8');
    expect(src).not.toMatch(/SHADOW_WEIGHTS \(v2\.1-B \+ shadow factor 활성\)/);
    expect(src).not.toMatch(/rejected Brier 0\.4635/);
    expect(src).toMatch(/Shadow 실험 가중치 구성/);
  });

  it('debug/model-comparison/page.tsx: "v2.1-B shadow 누적 중" 미래시제 제거 + rejected 반영', () => {
    const src = readFileSync(join(ROOT, 'src/app/debug/model-comparison/page.tsx'), 'utf8');
    expect(src).not.toMatch(/v2\.1-B shadow 누적 중/);
    expect(src).toMatch(/rejected Brier 0\.4635/);
    expect(src).toMatch(/누적 아카이브/);
  });

  it('components/layout/Header.tsx: "/accuracy/shadow" description "v2.1-B 섀도우 cohort 비교" stale 제거', () => {
    const src = readFileSync(join(ROOT, 'src/components/layout/Header.tsx'), 'utf8');
    expect(src).not.toMatch(/v2\.1-B 섀도우 cohort 비교/);
    expect(src).toMatch(/v2\.1-B \(rejected\) cohort 아카이브/);
  });
});
