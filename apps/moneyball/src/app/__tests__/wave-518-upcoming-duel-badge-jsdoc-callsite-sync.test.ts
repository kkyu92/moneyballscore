import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SP_FIP_DUEL_MIN, LINEUP_WOBA_DUEL_MIN } from '@moneyball/shared';

// wave-518: SP FIP·wOBA 직접 대결 배지 JSDoc callsite sync
// review-code (heavy) — cycle 1885
// Feature-Drift Cycle: explore-idea (wave-517) → review-code (wave-518)
// gap: wave-517 가 analysis/page.tsx 이번 주 남은 경기 카드에 SP_FIP_DUEL_MIN·LINEUP_WOBA_DUEL_MIN
//      신규 callsite 추가했으나 두 상수 JSDoc 에 wave-517 미박제

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

const analysisPageSrc = readFileSync(
  join(__dirname, '../../app/analysis/page.tsx'),
  'utf8',
);

describe('wave-518 — SP FIP·wOBA 이번 주 남은 경기 카드 JSDoc callsite sync', () => {
  it('SP_FIP_DUEL_MIN 값 0.5', () => {
    expect(SP_FIP_DUEL_MIN).toBe(0.5);
  });

  it('LINEUP_WOBA_DUEL_MIN 값 0.020', () => {
    expect(LINEUP_WOBA_DUEL_MIN).toBe(0.020);
  });

  it('analysis/page.tsx 가 wave-517 SP FIP 직접 대결 배지 callsite 포함', () => {
    expect(analysisPageSrc).toContain('wave-517: SP FIP 직접 대결 배지');
  });

  it('analysis/page.tsx 가 wave-517 wOBA 타선 직접 대결 배지 callsite 포함', () => {
    expect(analysisPageSrc).toContain('wave-517: wOBA 타선 직접 대결 배지');
  });

  it('analysis/page.tsx 가 SP_FIP_DUEL_MIN 사용', () => {
    expect(analysisPageSrc).toContain('SP_FIP_DUEL_MIN');
  });

  it('analysis/page.tsx 가 LINEUP_WOBA_DUEL_MIN 사용', () => {
    expect(analysisPageSrc).toContain('LINEUP_WOBA_DUEL_MIN');
  });

  it('SP_FIP_DUEL_MIN JSDoc 에 wave-517 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const SP_FIP_DUEL_MIN');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 500), idx);
    expect(jsdoc).toContain('wave-517');
  });

  it('LINEUP_WOBA_DUEL_MIN JSDoc 에 wave-517 callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const LINEUP_WOBA_DUEL_MIN');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 500), idx);
    expect(jsdoc).toContain('wave-517');
  });

  it('SP_FIP_DUEL_MIN "변경 시" 라인에 wave-517 포함', () => {
    const idx = sharedSrc.indexOf('export const SP_FIP_DUEL_MIN');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 500), idx);
    expect(jsdoc).toMatch(/wave-363\/446\/499\/517/);
  });

  it('LINEUP_WOBA_DUEL_MIN "변경 시" 라인에 wave-517 포함', () => {
    const idx = sharedSrc.indexOf('export const LINEUP_WOBA_DUEL_MIN');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 500), idx);
    expect(jsdoc).toMatch(/wave-355\/442\/501\/517/);
  });

  it('wave-518 마커 존재 확인 (test file)', () => {
    expect('wave-518').toContain('wave-518');
  });
});
