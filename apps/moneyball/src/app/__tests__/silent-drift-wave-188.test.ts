import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 188 — methodology/about/v2-shadow-monitor "도달 시/후" v2.0 미래시제 → 임계 달성 반영', () => {
  it('methodology/page.tsx: v2.0 version 라벨 "예정" 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/methodology/page.tsx'), 'utf8');
    const v2Block = src.match(/version:\s*"v2\.0[\s\S]*?\},/);
    expect(v2Block).not.toBeNull();
    expect(v2Block![0]).not.toMatch(/예정/);
  });

  it('methodology/page.tsx: v2.0 change 텍스트 "이상 누적 시" 미래시제 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/methodology/page.tsx'), 'utf8');
    const v2Block = src.match(/version:\s*"v2\.0[\s\S]*?\},/);
    expect(v2Block).not.toBeNull();
    expect(v2Block![0]).not.toMatch(/이상\s*누적\s*시/);
  });

  it('methodology/page.tsx: v2.0 change 텍스트 달성 완료 + /accuracy 참조 유지', () => {
    const src = readFileSync(join(ROOT, 'src/app/methodology/page.tsx'), 'utf8');
    const v2Block = src.match(/version:\s*"v2\.0[\s\S]*?\},/);
    expect(v2Block).not.toBeNull();
    expect(v2Block![0]).toMatch(/달성 완료/);
    expect(v2Block![0]).toMatch(/\/accuracy/);
  });

  it('about/page.tsx: "도달 시 v2.0 전면 재조정 예정" 미래시제 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/about/page.tsx'), 'utf8');
    expect(src).not.toMatch(/도달 시 v2\.0 전면 재조정 예정/);
  });

  it('about/page.tsx: v2.0 관련 답변에 달성 완료 + /accuracy 참조', () => {
    const src = readFileSync(join(ROOT, 'src/app/about/page.tsx'), 'utf8');
    expect(src).toMatch(/달성 완료/);
    expect(src).toMatch(/\/accuracy/);
  });

  it('v2-shadow-monitor/page.tsx: metadata description "도달 시 v2.0 가중치 확정 결정을 위한" 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/v2-shadow-monitor/page.tsx'), 'utf8');
    expect(src).not.toMatch(/도달 시 v2\.0 가중치 확정 결정을 위한/);
  });

  it('v2-shadow-monitor/page.tsx: JSON-LD description "도달 시 v2.0 가중치 확정 결정" 제거', () => {
    const src = readFileSync(join(ROOT, 'src/app/v2-shadow-monitor/page.tsx'), 'utf8');
    expect(src).not.toMatch(/도달 시 v2\.0 가중치 확정 결정\./);
  });

  it('v2-shadow-monitor/page.tsx: 임계 달성 + V2_PROMOTION_COHORT_N registry 참조 유지', () => {
    const src = readFileSync(join(ROOT, 'src/app/v2-shadow-monitor/page.tsx'), 'utf8');
    expect(src).toMatch(/임계 달성/);
    expect(src).toMatch(/V2_PROMOTION_COHORT_N/);
  });
});
