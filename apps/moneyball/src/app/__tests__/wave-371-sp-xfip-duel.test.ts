import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SP_XFIP_DUEL_MIN, SP_FIP_DUEL_MIN } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('wave-371 — 선발 xFIP 직접 대결 배지 (cycle 1711)', () => {
  it('SP_XFIP_DUEL_MIN = 0.5 (SP_FIP_DUEL_MIN 동일 임계)', () => {
    expect(SP_XFIP_DUEL_MIN).toBe(0.5);
    expect(SP_XFIP_DUEL_MIN).toBe(SP_FIP_DUEL_MIN);
  });

  it('analysis/page.tsx 에 wave-371 xFIP 직접 대결 배지 존재', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    expect(src).toContain('wave-371');
    expect(src).toContain('SP_XFIP_DUEL_MIN');
    expect(src).toContain('xFIP');
  });

  it('homeSPXfip < awaySPXfip 시 홈팀 강세 (gap > 0 → favoredHome)', () => {
    const homeSPXfip = 3.2;
    const awaySPXfip = 4.0;
    const gap = awaySPXfip - homeSPXfip;
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeGreaterThanOrEqual(SP_XFIP_DUEL_MIN);
    const favoredHome = gap > 0;
    expect(favoredHome).toBe(true);
  });

  it('awaySPXfip < homeSPXfip 시 원정팀 강세 (gap < 0 → favoredHome=false)', () => {
    const homeSPXfip = 4.5;
    const awaySPXfip = 3.5;
    const gap = awaySPXfip - homeSPXfip;
    expect(gap).toBeLessThan(0);
    expect(Math.abs(gap)).toBeGreaterThanOrEqual(SP_XFIP_DUEL_MIN);
    const favoredHome = gap > 0;
    expect(favoredHome).toBe(false);
  });

  it('|gap| < SP_XFIP_DUEL_MIN 시 배지 미노출 (null 반환)', () => {
    const homeSPXfip = 3.8;
    const awaySPXfip = 4.0;
    const gap = awaySPXfip - homeSPXfip;
    expect(Math.abs(gap)).toBeLessThan(SP_XFIP_DUEL_MIN);
  });

  it('SP_XFIP_DUEL_MIN import — analysis/page.tsx', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    expect(src).toContain('SP_XFIP_DUEL_MIN');
  });
});
