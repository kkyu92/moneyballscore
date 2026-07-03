import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE_PATH = join(__dirname, '../page.tsx');
const SRC = readFileSync(PAGE_PATH, 'utf8');

describe('silent drift wave 186 — methodology v2.0 entry "cohort 누적 진행 중" stale claim redirect', () => {
  it('v2.0 version entry does not hardcode "cohort 누적 진행 중" stale accumulation claim', () => {
    const v2Block = SRC.match(/version:\s*"v2\.0[\s\S]*?\},/);
    expect(v2Block).not.toBeNull();
    expect(v2Block![0]).not.toMatch(/cohort\s*누적\s*진행\s*중/);
  });

  it('v2.0 version entry redirects to /accuracy for live cohort progress', () => {
    const v2Block = SRC.match(/version:\s*"v2\.0[\s\S]*?\},/);
    expect(v2Block).not.toBeNull();
    expect(v2Block![0]).toMatch(/\/accuracy/);
  });

  it('v2.0 version entry preserves V2_PROMOTION_COHORT_N registry reference', () => {
    const v2Block = SRC.match(/version:\s*"v2\.0[\s\S]*?\},/);
    expect(v2Block).not.toBeNull();
    expect(v2Block![0]).toMatch(/V2_PROMOTION_COHORT_N/);
  });
});
