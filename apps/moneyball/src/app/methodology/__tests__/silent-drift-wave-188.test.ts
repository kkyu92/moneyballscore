import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE_PATH = join(__dirname, '../page.tsx');
const SRC = readFileSync(PAGE_PATH, 'utf8');

describe('silent drift wave 188 — methodology v2.0 date "도달 후" 미래시제 → crossed live redirect', () => {
  it('v2.0 version date does not hardcode "도달 후" future-tense claim', () => {
    const v2Block = SRC.match(/version:\s*"v2\.0[\s\S]*?\},/);
    expect(v2Block).not.toBeNull();
    expect(v2Block![0]).not.toMatch(/도달\s*후/);
  });

  it('v2.0 version date reflects crossed threshold reality', () => {
    const v2Block = SRC.match(/version:\s*"v2\.0[\s\S]*?\},/);
    expect(v2Block).not.toBeNull();
    expect(v2Block![0]).toMatch(/crossed/);
  });

  it('v2.0 version date redirects to /accuracy for live cohort progress', () => {
    const v2Block = SRC.match(/version:\s*"v2\.0[\s\S]*?\},/);
    expect(v2Block).not.toBeNull();
    expect(v2Block![0]).toMatch(/\/accuracy/);
  });

  it('v2.0 version date preserves V2_PROMOTION_COHORT_N registry reference', () => {
    const v2Block = SRC.match(/version:\s*"v2\.0[\s\S]*?\},/);
    expect(v2Block).not.toBeNull();
    expect(v2Block![0]).toMatch(/V2_PROMOTION_COHORT_N/);
  });
});
