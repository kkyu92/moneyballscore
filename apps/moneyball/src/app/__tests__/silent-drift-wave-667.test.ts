import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');
const TARGET = 'src/components/dashboard/WeeklyTrendMini.tsx';

describe('silent drift wave 667 — 홈페이지 "최근 4주 성과" 히어로 통계 소표본 게이트 부재 (review-code heavy, cycle 2546)', () => {
  const src = readFileSync(join(ROOT, TARGET), 'utf8');

  it('imports SMALL_SAMPLE_N from shared', () => {
    expect(src).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/);
  });

  it('gates barColor with SMALL_SAMPLE_N instead of verified === 0', () => {
    expect(src).toMatch(/verified\s*<\s*SMALL_SAMPLE_N/);
    expect(src).not.toMatch(/if \(verified === 0\) return neutral/);
  });

  it('gates the hero percent color/tooltip with SMALL_SAMPLE_N', () => {
    expect(src).toMatch(/current\?\.verified\s*\?\?\s*0\)\s*<\s*SMALL_SAMPLE_N/);
  });

  it('surfaces an inline small-sample note in tooltip and hero label', () => {
    expect(src).toMatch(/소표본/);
  });
});
