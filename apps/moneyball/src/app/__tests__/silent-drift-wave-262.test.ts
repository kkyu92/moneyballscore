import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 262 — methodology/page.tsx n=150+ 하드코딩 → V2_PROMOTION_COHORT_N registry derive (cycle 1569)', () => {
  it('methodology/page.tsx: 하드코딩 "n=150+" 리터럴 제거', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/methodology/page.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/n=150\+/);
  });

  it('methodology/page.tsx: V2_PROMOTION_COHORT_N import 사용', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/methodology/page.tsx'),
      'utf8',
    );
    expect(src).toMatch(/V2_PROMOTION_COHORT_N/);
  });
});
