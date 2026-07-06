import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 191 — v2-shadow-monitor + methodology + accuracy/shadow + v2-preview "임계 달성/도달 후 v2.0 결정 대기" stale → v2.1-B rejected 정합', () => {
  it('v2-shadow-monitor/page.tsx: metadata description "임계 달성, v2.0 결정 대기" stale 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/v2-shadow-monitor/page.tsx'), 'utf8');
    expect(src).not.toMatch(/임계 달성, v2\.0 결정 대기/);
    expect(src).toMatch(/v2\.1-B rejected/);
    expect(src).toMatch(/Brier 0\.4635/);
  });

  it('v2-shadow-monitor/page.tsx: body "임계 달성 완료 — v2.0 결정 대기 중" stale 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/v2-shadow-monitor/page.tsx'), 'utf8');
    expect(src).not.toMatch(/임계 달성 완료 — v2\.0 결정 대기 중/);
    expect(src).toMatch(/v2\.1-B rejected/);
  });

  it('methodology/page.tsx: version label "v2.0 (임계 도달, 결정 대기)" stale 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/methodology/page.tsx'), 'utf8');
    expect(src).not.toMatch(/v2\.0 \(임계 도달, 결정 대기\)/);
    expect(src).toMatch(/v2\.1-B shadow rejected \(Brier 0\.4635, n=52\)/);
  });

  it('accuracy/shadow/page.tsx: body "도달 후 production 적용 결정" 미래시제 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/accuracy/shadow/page.tsx'), 'utf8');
    expect(src).not.toMatch(/도달 후\s+production 적용 결정/);
    expect(src).toMatch(/v2\.1-B rejected/);
  });

  it('v2-preview/page.tsx: noindex 주석 "도달 후 prod 적용 결정 전까지" 미래시제 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/v2-preview/page.tsx'), 'utf8');
    expect(src).not.toMatch(/도달 후 prod 적용 결정 전까지/);
    expect(src).toMatch(/임계 달성 완료, v2\.1-B rejected/);
  });
});
