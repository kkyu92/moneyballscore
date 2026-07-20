import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  H2H_DOMINANT_RATE,
  H2H_WEAK_RATE,
  PARK_FACTOR_HITTER_MIN,
  PARK_FACTOR_PITCHER_MAX,
} from '@moneyball/shared';

// wave-514: H2H/park factor JSDoc computeCompositeDuel.ts callsite sync
// review-code (heavy) — cycle 1881
// Feature-Drift Cycle: explore-idea (wave-513) → review-code (wave-514)
// gap: computeCompositeDuel.ts 가 H2H_DOMINANT_RATE/H2H_WEAK_RATE/PARK_FACTOR_HITTER_MIN/PARK_FACTOR_PITCHER_MAX 사용 중이나
//      wave-509 sync 에서 누락 — 4개 상수의 JSDoc "변경 시" 라인에 computeCompositeDuel.ts callsite 미박제

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

const compositeDuelSrc = readFileSync(
  join(__dirname, '../../lib/analysis/computeCompositeDuel.ts'),
  'utf8',
);

describe('wave-514 — H2H/park factor JSDoc computeCompositeDuel.ts callsite sync', () => {
  it('H2H_DOMINANT_RATE 값 0.6', () => {
    expect(H2H_DOMINANT_RATE).toBe(0.6);
  });

  it('H2H_WEAK_RATE 값 0.4', () => {
    expect(H2H_WEAK_RATE).toBe(0.4);
  });

  it('PARK_FACTOR_HITTER_MIN 값 105', () => {
    expect(PARK_FACTOR_HITTER_MIN).toBe(105);
  });

  it('PARK_FACTOR_PITCHER_MAX 값 95', () => {
    expect(PARK_FACTOR_PITCHER_MAX).toBe(95);
  });

  it('computeCompositeDuel.ts 가 H2H_DOMINANT_RATE 사용', () => {
    expect(compositeDuelSrc).toContain('H2H_DOMINANT_RATE');
  });

  it('computeCompositeDuel.ts 가 H2H_WEAK_RATE 사용', () => {
    expect(compositeDuelSrc).toContain('H2H_WEAK_RATE');
  });

  it('computeCompositeDuel.ts 가 PARK_FACTOR_HITTER_MIN 사용', () => {
    expect(compositeDuelSrc).toContain('PARK_FACTOR_HITTER_MIN');
  });

  it('computeCompositeDuel.ts 가 PARK_FACTOR_PITCHER_MAX 사용', () => {
    expect(compositeDuelSrc).toContain('PARK_FACTOR_PITCHER_MAX');
  });

  it('H2H_DOMINANT_RATE JSDoc 에 wave-514 computeCompositeDuel.ts callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const H2H_DOMINANT_RATE');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 400), idx);
    expect(jsdoc).toContain('computeCompositeDuel.ts');
  });

  it('H2H_WEAK_RATE JSDoc 에 wave-514 computeCompositeDuel.ts callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const H2H_WEAK_RATE');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 400), idx);
    expect(jsdoc).toContain('computeCompositeDuel.ts');
  });

  it('PARK_FACTOR_HITTER_MIN JSDoc 에 wave-514 computeCompositeDuel.ts callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const PARK_FACTOR_HITTER_MIN');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 400), idx);
    expect(jsdoc).toContain('computeCompositeDuel.ts');
  });

  it('wave-514 마커 존재 확인 (index.ts)', () => {
    expect(sharedSrc).toContain('wave-514');
  });
});
