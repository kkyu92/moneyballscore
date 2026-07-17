import { describe, it, expect } from 'vitest';
import { FACTOR_PICK_MIN_FACTORS, FACTOR_PICK_STRONG, FACTOR_PICK_COMPLETE } from '@moneyball/shared';

// wave-398: 팩터 수렴 픽 수렴 강도 색상 등급 로직 박제
// analysis/page.tsx — convStrength = Math.abs(compositeDuelScore)
// 7 = 임계(FACTOR_PICK_MIN_FACTORS), 8-9 = 강(FACTOR_PICK_STRONG), 10 = 완전수렴(FACTOR_PICK_COMPLETE, gold)
//
// ratioColorClass:
//   convStrength >= FACTOR_PICK_COMPLETE(10) → accent(gold)
//   convStrength >= FACTOR_PICK_STRONG(8)    → brand-500(green)
//   else                                     → gray-500

function getConvergenceColorTier(compositeDuelScore: number): 'gold' | 'brand' | 'gray' {
  const convStrength = Math.abs(compositeDuelScore);
  if (convStrength >= FACTOR_PICK_COMPLETE) return 'gold';
  if (convStrength >= FACTOR_PICK_STRONG) return 'brand';
  return 'gray';
}

describe('wave-398: 수렴 강도 색상 등급', () => {
  it('FACTOR_PICK_MIN_FACTORS = 7 (임계)', () => {
    expect(FACTOR_PICK_MIN_FACTORS).toBe(7);
  });

  it('score 7: gray (임계, 최소 강도)', () => {
    expect(getConvergenceColorTier(7)).toBe('gray');
    expect(getConvergenceColorTier(-7)).toBe('gray');
  });

  it('score 8: brand green (강수렴)', () => {
    expect(getConvergenceColorTier(8)).toBe('brand');
    expect(getConvergenceColorTier(-8)).toBe('brand');
  });

  it('score 9: brand green (강수렴)', () => {
    expect(getConvergenceColorTier(9)).toBe('brand');
    expect(getConvergenceColorTier(-9)).toBe('brand');
  });

  it('score 10: gold (완전수렴 — 10팩터 전부 동의)', () => {
    expect(getConvergenceColorTier(10)).toBe('gold');
    expect(getConvergenceColorTier(-10)).toBe('gold');
  });

  it('score 0: gray (수렴 없음, 팩터 픽 섹션 등장 불가)', () => {
    // factorPickGames 필터: |score| >= 7 이라 score=0은 미노출
    expect(getConvergenceColorTier(0)).toBe('gray');
  });

  it('gameTime substring(0,5) — HH:MM 표시', () => {
    const gameTime = '18:30:00';
    expect(gameTime.substring(0, 5)).toBe('18:30');
  });

  it('gameTime null guard — 조건부 렌더링 패턴', () => {
    const formatGameTime = (t: string | null) => t ? t.substring(0, 5) : null;
    expect(formatGameTime(null)).toBeNull();
    expect(formatGameTime('18:30:00')).toBe('18:30');
  });
});
