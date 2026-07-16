import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SP_AVG_FIP_DUEL, LINEUP_AVG_WOBA_HITTER, SP_FIP_STRONG, SP_FIP_WEAK, LINEUP_WOBA_STRONG_TAG, LINEUP_WOBA_WEAK_TAG } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('silent drift wave-347 — 경기 유형 배지 단일 소스 (cycle 1684)', () => {
  it('SP_AVG_FIP_DUEL = 4.0 단일 소스 가드', () => {
    expect(SP_AVG_FIP_DUEL).toBe(4.0);
  });

  it('LINEUP_AVG_WOBA_HITTER = 0.32 단일 소스 가드', () => {
    expect(LINEUP_AVG_WOBA_HITTER).toBe(0.32);
  });

  it('SP_AVG_FIP_DUEL 은 SP_FIP_STRONG과 SP_FIP_WEAK 사이 중간값', () => {
    expect(SP_AVG_FIP_DUEL).toBeGreaterThan(SP_FIP_STRONG);
    expect(SP_AVG_FIP_DUEL).toBeLessThan(SP_FIP_WEAK);
  });

  it('LINEUP_AVG_WOBA_HITTER 은 LINEUP_WOBA_WEAK_TAG와 LINEUP_WOBA_STRONG_TAG 사이', () => {
    expect(LINEUP_AVG_WOBA_HITTER).toBeGreaterThan(LINEUP_WOBA_WEAK_TAG);
    expect(LINEUP_AVG_WOBA_HITTER).toBeLessThan(LINEUP_WOBA_STRONG_TAG);
  });

  it('analysis/page.tsx: SP_AVG_FIP_DUEL import 단일 소스', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('SP_AVG_FIP_DUEL');
    expect(src).not.toMatch(/avgSpFip\s*<\s*4\.0/);
    expect(src).not.toMatch(/avgSpFip\s*<\s*4,/);
  });

  it('analysis/page.tsx: LINEUP_AVG_WOBA_HITTER import 단일 소스', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('LINEUP_AVG_WOBA_HITTER');
    expect(src).not.toMatch(/avgLineupWoba\s*>\s*0\.32/);
  });

  it('analysis/page.tsx: wave-347 gameTypeTag 배지 구현', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-347');
    expect(src).toContain('gameTypeTag');
    expect(src).toContain('투수전 예상');
    expect(src).toContain('타격전 예상');
  });

  it('투수전 판정 로직: avgSpFip < SP_AVG_FIP_DUEL(4.0) 우선', () => {
    const awaySPFip = 3.2;
    const homeSPFip = 3.8;
    const avgSpFip = (awaySPFip + homeSPFip) / 2;
    const avgLineupWoba = 0.31;
    const gameTypeTag =
      avgSpFip < SP_AVG_FIP_DUEL
        ? '투수전 예상'
        : avgLineupWoba > LINEUP_AVG_WOBA_HITTER
          ? '타격전 예상'
          : null;
    expect(gameTypeTag).toBe('투수전 예상');
  });

  it('타격전 판정 로직: avgWoba > LINEUP_AVG_WOBA_HITTER(0.32)', () => {
    const awaySPFip = 4.5;
    const homeSPFip = 4.8;
    const avgSpFip = (awaySPFip + homeSPFip) / 2;
    const avgLineupWoba = 0.335;
    const gameTypeTag =
      avgSpFip < SP_AVG_FIP_DUEL
        ? '투수전 예상'
        : avgLineupWoba > LINEUP_AVG_WOBA_HITTER
          ? '타격전 예상'
          : null;
    expect(gameTypeTag).toBe('타격전 예상');
  });

  it('균형 매치업: null 반환', () => {
    const avgSpFip = 4.2;
    const avgLineupWoba = 0.315;
    const gameTypeTag =
      avgSpFip < SP_AVG_FIP_DUEL
        ? '투수전 예상'
        : avgLineupWoba > LINEUP_AVG_WOBA_HITTER
          ? '타격전 예상'
          : null;
    expect(gameTypeTag).toBeNull();
  });
});
