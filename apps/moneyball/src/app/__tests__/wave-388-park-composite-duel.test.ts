import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PARK_FACTOR_HITTER_MIN, PARK_FACTOR_PITCHER_MAX, KBO_TEAMS } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');
const COMPUTE_DUEL = join(ROOT, 'src/lib/analysis/computeCompositeDuel.ts');

/** 10팩터 COMPOSITE_DUEL 구장보정 팩터 로직 재현 */
function computeParkResult(
  homeCode: keyof typeof KBO_TEAMS,
): 'home' | 'away' | null {
  const pf = KBO_TEAMS[homeCode]?.parkPf;
  if (pf === undefined) return null;
  if (pf >= PARK_FACTOR_HITTER_MIN) return 'home';
  if (pf <= PARK_FACTOR_PITCHER_MAX) return 'away';
  return null;
}

describe('wave-388 — COMPOSITE_DUEL 구장보정 10팩터 편입 (cycle 1732)', () => {
  it('PARK_FACTOR_HITTER_MIN = 105', () => {
    expect(PARK_FACTOR_HITTER_MIN).toBe(105);
  });

  it('PARK_FACTOR_PITCHER_MAX = 95', () => {
    expect(PARK_FACTOR_PITCHER_MAX).toBe(95);
  });

  it('SS (대구 108, 극단적 타자 친화) → home', () => {
    expect(computeParkResult('SS')).toBe('home');
  });

  it('SK (인천 105, 타자 친화 경계) → home', () => {
    expect(computeParkResult('SK')).toBe('home');
  });

  it('WO (고척 92, 극단적 투수 친화) → away', () => {
    expect(computeParkResult('WO')).toBe('away');
  });

  it('LG (잠실 95, 투수 친화 경계) → away', () => {
    expect(computeParkResult('LG')).toBe('away');
  });

  it('OB (잠실 95, 투수 친화 경계) → away', () => {
    expect(computeParkResult('OB')).toBe('away');
  });

  it('HT (광주 100, 중립) → null', () => {
    expect(computeParkResult('HT')).toBeNull();
  });

  it('NC (창원 100, 중립) → null', () => {
    expect(computeParkResult('NC')).toBeNull();
  });

  it('KT (수원 98, 중립~약 투수 친화) → null', () => {
    expect(computeParkResult('KT')).toBeNull();
  });

  it('LT (부산 103, 약 타자 친화) → null (105 미만)', () => {
    expect(computeParkResult('LT')).toBeNull();
  });

  it('HH (대전 101, 중립~약 타자 친화) → null', () => {
    expect(computeParkResult('HH')).toBeNull();
  });

  it('computeCompositeDuel.ts: wave-388 구장보정 팩터 포함', () => {
    const src = readFileSync(COMPUTE_DUEL, 'utf8');
    expect(src).toContain('wave-388');
    expect(src).toContain('parkResult');
    expect(src).toContain('PARK_FACTOR_HITTER_MIN');
    expect(src).toContain('PARK_FACTOR_PITCHER_MAX');
    expect(src).toContain("KBO_TEAMS[g.homeCode]?.parkPf !== undefined");
  });

  it('computeCompositeDuel.ts: 10팩터 results 배열에 spXfipResult + parkResult 포함', () => {
    const src = readFileSync(COMPUTE_DUEL, 'utf8');
    expect(src).toContain('spXfipResult');
    expect(src).toContain('parkResult');
  });

  it('analysis/page.tsx: computeCompositeDuel 헬퍼 사용 (wave-391 추출)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('computeCompositeDuel');
    expect(src).toContain('compositeDuelHomeWins');
    expect(src).toContain('compositeDuelAwayWins');
  });

  it('analysis/page.tsx: 10팩터 언급', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('10팩터');
  });
});
