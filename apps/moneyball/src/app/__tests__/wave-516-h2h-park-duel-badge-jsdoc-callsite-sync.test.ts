import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  H2H_DOMINANT_RATE,
  H2H_WEAK_RATE,
  PARK_FACTOR_HITTER_MIN,
  PARK_FACTOR_PITCHER_MAX,
} from '@moneyball/shared';

// wave-516: H2H·구장 직접 대결 배지 JSDoc callsite sync
// review-code (heavy) — cycle 1883
// Feature-Drift Cycle: explore-idea (wave-515) → review-code (wave-516)
// gap: wave-515 가 analysis/page.tsx 에 H2H/park factor 직접 대결 배지 신규 callsite 추가했으나
//      H2H_DOMINANT_RATE/H2H_WEAK_RATE/PARK_FACTOR_HITTER_MIN/PARK_FACTOR_PITCHER_MAX JSDoc 에 wave-516 미박제

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

const analysisPageSrc = readFileSync(
  join(__dirname, '../../app/analysis/page.tsx'),
  'utf8',
);

describe('wave-516 — H2H·구장 직접 대결 배지 JSDoc callsite sync', () => {
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

  it('analysis/page.tsx 가 wave-515 H2H 직접 대결 배지 callsite 포함', () => {
    expect(analysisPageSrc).toContain('wave-515: 상대전적 직접 대결 배지');
  });

  it('analysis/page.tsx 가 wave-515 구장 직접 대결 배지 callsite 포함', () => {
    expect(analysisPageSrc).toContain('wave-515: 구장 직접 대결 배지');
  });

  it('analysis/page.tsx 가 H2H_DOMINANT_RATE 사용', () => {
    expect(analysisPageSrc).toContain('H2H_DOMINANT_RATE');
  });

  it('analysis/page.tsx 가 PARK_FACTOR_HITTER_MIN 사용', () => {
    expect(analysisPageSrc).toContain('PARK_FACTOR_HITTER_MIN');
  });

  it('H2H_DOMINANT_RATE JSDoc 에 wave-516 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const H2H_DOMINANT_RATE');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 500), idx);
    expect(jsdoc).toContain('wave-516');
  });

  it('H2H_WEAK_RATE JSDoc 에 wave-516 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const H2H_WEAK_RATE');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 500), idx);
    expect(jsdoc).toContain('wave-516');
  });

  it('PARK_FACTOR_HITTER_MIN JSDoc 에 wave-516 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const PARK_FACTOR_HITTER_MIN');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 500), idx);
    expect(jsdoc).toContain('wave-516');
  });

  it('wave-516 마커 존재 확인 (index.ts)', () => {
    expect(sharedSrc).toContain('wave-516');
  });
});
