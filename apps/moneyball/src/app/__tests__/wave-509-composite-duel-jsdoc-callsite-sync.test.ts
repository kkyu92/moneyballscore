import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  LINEUP_WOBA_DUEL_MIN,
  SFR_DUEL_MIN,
  BULLPEN_FIP_DIFF_MIN,
  SP_FIP_DUEL_MIN,
  SP_XFIP_DUEL_MIN,
  RECENT_FORM_DUEL_MIN,
  WAR_DUEL_MIN,
  ELO_GAP_STRONG,
} from '@moneyball/shared';

// wave-509: 6-constant JSDoc computeCompositeDuel.ts callsite sync
// review-code (heavy) — cycle 1876
// Feature-Drift Cycle: explore-idea (wave-508) → review-code (wave-509)
// gap: computeCompositeDuel.ts 가 8개 DUEL 상수를 모두 사용하나
//      6개 상수의 JSDoc "변경 시" 라인이 computeCompositeDuel.ts callsite 누락

const sharedSrc = readFileSync(
  join(__dirname, '../../../../../packages/shared/src/index.ts'),
  'utf8',
);

const compositeDuelSrc = readFileSync(
  join(__dirname, '../../lib/analysis/computeCompositeDuel.ts'),
  'utf8',
);

describe('wave-509 — 6-constant JSDoc computeCompositeDuel.ts callsite sync', () => {
  it('LINEUP_WOBA_DUEL_MIN 값 0.020', () => {
    expect(LINEUP_WOBA_DUEL_MIN).toBe(0.020);
  });

  it('SFR_DUEL_MIN 값 5.0', () => {
    expect(SFR_DUEL_MIN).toBe(5.0);
  });

  it('BULLPEN_FIP_DIFF_MIN 값 1.0', () => {
    expect(BULLPEN_FIP_DIFF_MIN).toBe(1.0);
  });

  it('SP_FIP_DUEL_MIN 값 0.5', () => {
    expect(SP_FIP_DUEL_MIN).toBe(0.5);
  });

  it('SP_XFIP_DUEL_MIN 값 0.5', () => {
    expect(SP_XFIP_DUEL_MIN).toBe(0.5);
  });

  it('RECENT_FORM_DUEL_MIN 값 0.10', () => {
    expect(RECENT_FORM_DUEL_MIN).toBe(0.10);
  });

  it('WAR_DUEL_MIN 이미 computeCompositeDuel.ts 포함 (기존 정상)', () => {
    expect(WAR_DUEL_MIN).toBe(5.0);
  });

  it('ELO_GAP_STRONG 이미 computeCompositeDuel.ts 포함 (기존 정상)', () => {
    expect(ELO_GAP_STRONG).toBe(50);
  });

  it('computeCompositeDuel.ts 가 LINEUP_WOBA_DUEL_MIN 사용', () => {
    expect(compositeDuelSrc).toContain('LINEUP_WOBA_DUEL_MIN');
  });

  it('computeCompositeDuel.ts 가 SFR_DUEL_MIN 사용', () => {
    expect(compositeDuelSrc).toContain('SFR_DUEL_MIN');
  });

  it('computeCompositeDuel.ts 가 BULLPEN_FIP_DIFF_MIN 사용', () => {
    expect(compositeDuelSrc).toContain('BULLPEN_FIP_DIFF_MIN');
  });

  it('computeCompositeDuel.ts 가 SP_FIP_DUEL_MIN 사용', () => {
    expect(compositeDuelSrc).toContain('SP_FIP_DUEL_MIN');
  });

  it('computeCompositeDuel.ts 가 SP_XFIP_DUEL_MIN 사용', () => {
    expect(compositeDuelSrc).toContain('SP_XFIP_DUEL_MIN');
  });

  it('computeCompositeDuel.ts 가 RECENT_FORM_DUEL_MIN 사용', () => {
    expect(compositeDuelSrc).toContain('RECENT_FORM_DUEL_MIN');
  });

  it('LINEUP_WOBA_DUEL_MIN JSDoc 에 wave-509 computeCompositeDuel.ts callsite 박제', () => {
    expect(sharedSrc).toContain(
      'LINEUP_WOBA_DUEL_MIN = 0.020'
    );
    const idx = sharedSrc.indexOf('export const LINEUP_WOBA_DUEL_MIN');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 400), idx);
    expect(jsdoc).toContain('computeCompositeDuel.ts');
  });

  it('SP_FIP_DUEL_MIN JSDoc 에 wave-509 computeCompositeDuel.ts callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const SP_FIP_DUEL_MIN');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 400), idx);
    expect(jsdoc).toContain('computeCompositeDuel.ts');
  });

  it('SP_XFIP_DUEL_MIN JSDoc 에 wave-509 computeCompositeDuel.ts callsite 박제', () => {
    const idx = sharedSrc.indexOf('export const SP_XFIP_DUEL_MIN');
    const jsdoc = sharedSrc.slice(Math.max(0, idx - 400), idx);
    expect(jsdoc).toContain('computeCompositeDuel.ts');
  });

  it('wave-509 마커 존재 확인 (index.ts)', () => {
    expect(sharedSrc).toContain('wave-509');
  });
});
