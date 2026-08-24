import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 674 — MyPicksClient 내/AI 적중률 히어로 소표본 게이트 부재 (review-code heavy, cycle 2562)', () => {
  const src = readFileSync(
    join(ROOT, 'src/components/picks/MyPicksClient.tsx'),
    'utf8',
  );

  it('imports SMALL_SAMPLE_N from shared', () => {
    expect(src).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/);
  });

  it('gates 내 적중률 hero stat with SMALL_SAMPLE_N', () => {
    expect(src).toMatch(/stats\.resolved\s*<\s*SMALL_SAMPLE_N/);
  });

  it('gates AI 적중률 hero stat with SMALL_SAMPLE_N', () => {
    expect(src).toMatch(/stats\.aiResolved\s*<\s*SMALL_SAMPLE_N/);
  });

  it('surfaces an inline small-sample note on the StatCard', () => {
    expect(src).toMatch(/소표본\(n<\$\{SMALL_SAMPLE_N\}\)/);
  });
});
