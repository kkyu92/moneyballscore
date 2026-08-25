import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// cycle 2600 polish-ui: cycle 2599 design-system 이 범위 밖으로 이연한
// text-[11px] 46건을 시각 검토 후 --text-2xs(10px) 로 흡수 (신규 토큰 승격 대신
// 기존 캡션/보조 라벨 토큰과 역할 동일하다고 판단, DESIGN.md 갱신).

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

describe('polish-ui cycle 2600 — text-[11px] 2xs 흡수', () => {
  it('text-[11px] arbitrary value 잔존 0건', () => {
    const files = walk(SRC_ROOT);
    const offenders: string[] = [];
    for (const f of files) {
      const content = readFileSync(f, 'utf8');
      if (/text-\[11px\]/.test(content)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
