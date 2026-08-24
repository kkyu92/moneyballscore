import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 676 — 수렴 픽 W-L 카드 소표본 게이트 부재 정정 (review-code heavy, cycle 2564)', () => {
  const files = [
    'src/app/reviews/page.tsx',
    'src/app/seasons/[year]/page.tsx',
    'src/app/mlb/reviews/page.tsx',
  ];

  it.each(files)('%s 는 SMALL_SAMPLE_N 을 import 하고 강/완전수렴 카드에 소표본 배지를 노출한다', (relPath) => {
    const src = readFileSync(join(ROOT, relPath), 'utf8');
    expect(src).toMatch(/SMALL_SAMPLE_N/);
    expect(src).toMatch(/strongConvergenceRecord\.total < SMALL_SAMPLE_N/);
    expect(src).toMatch(/completeConvergenceRecord\.total < SMALL_SAMPLE_N/);
    expect(src).toMatch(/소표본\(n<\$\{SMALL_SAMPLE_N\}\)/);
  });

  it('en/mlb/reviews 미러는 영문 small sample 배지를 노출한다', () => {
    const src = readFileSync(join(ROOT, 'src/app/en/mlb/reviews/page.tsx'), 'utf8');
    expect(src).toMatch(/SMALL_SAMPLE_N/);
    expect(src).toMatch(/strongConvergenceRecord\.total < SMALL_SAMPLE_N/);
    expect(src).toMatch(/completeConvergenceRecord\.total < SMALL_SAMPLE_N/);
    expect(src).toMatch(/small sample \(n<\$\{SMALL_SAMPLE_N\}\)/);
  });
});
