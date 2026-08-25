import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// cycle 2599 design-system: DESIGN.md 미문서화 arbitrary text-[9px]/text-[10px]
// 193건 (review-code cycle 2594/2597 이 too-large-for-single-cycle 로 두 번
// 이연한 항목) 을 --text-3xs(9px)/--text-2xs(10px) 정식 토큰으로 승격 + 전체 치환.
// text-[11px] 46건은 3xs/2xs/xs(12) 사이 값이라 시각 검토 필요 — 본 cycle 범위 밖.

const SRC_ROOT = join(__dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe('design system cycle 2599 — micro typography scale 토큰화', () => {
  it('globals.css 에 --text-3xs(9px)/--text-2xs(10px) 토큰 정의', () => {
    const css = readFileSync(join(SRC_ROOT, 'app/globals.css'), 'utf8');
    expect(css).toContain('--text-3xs: 0.5625rem');
    expect(css).toContain('--text-2xs: 0.625rem');
  });

  it('text-[9px]/text-[10px] arbitrary value 잔존 0건 (전부 named token 치환)', () => {
    const files = walk(SRC_ROOT);
    const offenders: string[] = [];
    for (const f of files) {
      const content = readFileSync(f, 'utf8');
      if (/text-\[(9|10)px\]/.test(content)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
