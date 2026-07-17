import { describe, it, expect } from 'vitest';
import { SP_FIP_STRONG, SP_FIP_WEAK } from '@moneyball/shared';

// wave-407: 팩터 수렴 픽 선발 FIP 대결 표시
// analysis/page.tsx — factor pick 카드 SP FIP 조건부 렌더링 로직
//
// 표시 조건:
//   1. pick.homeSPFip != null && pick.awaySPFip != null
//   2. 'sp_fip' in favoredSlugs OR 'sp_fip' in unfavoredSlugs
//
// 색상 분류:
//   FIP < SP_FIP_STRONG(3.5) → brand color (강세)
//   FIP > SP_FIP_WEAK(4.5)  → orange color (약세)
//   그 외                   → gray (중립)

function shouldShowSpFip(
  homeSPFip: number | null | undefined,
  awaySPFip: number | null | undefined,
  favoredSlugs: string[],
  unfavoredSlugs: string[],
): boolean {
  return (
    homeSPFip != null &&
    awaySPFip != null &&
    (favoredSlugs.includes('sp_fip') || unfavoredSlugs.includes('sp_fip'))
  );
}

function classifyFip(fip: number): 'brand' | 'orange' | 'neutral' {
  if (fip < SP_FIP_STRONG) return 'brand';
  if (fip > SP_FIP_WEAK) return 'orange';
  return 'neutral';
}

describe('wave-407: 팩터 수렴 픽 선발 FIP 대결 표시', () => {
  describe('표시 조건', () => {
    it('양쪽 FIP 있고 sp_fip 수렴 팩터 포함(favored) → 표시', () => {
      expect(shouldShowSpFip(3.2, 4.1, ['sp_fip', 'elo'], ['recent_form'])).toBe(true);
    });

    it('양쪽 FIP 있고 sp_fip 수렴 팩터 포함(unfavored) → 표시', () => {
      expect(shouldShowSpFip(4.5, 3.0, ['elo'], ['sp_fip', 'lineup_woba'])).toBe(true);
    });

    it('홈 FIP null → 미표시', () => {
      expect(shouldShowSpFip(null, 3.5, ['sp_fip'], [])).toBe(false);
    });

    it('원정 FIP null → 미표시', () => {
      expect(shouldShowSpFip(3.5, null, ['sp_fip'], [])).toBe(false);
    });

    it('양쪽 FIP 있어도 sp_fip 수렴 팩터 미포함 → 미표시', () => {
      expect(shouldShowSpFip(3.2, 4.1, ['elo', 'lineup_woba'], ['recent_form'])).toBe(false);
    });

    it('둘 다 null → 미표시', () => {
      expect(shouldShowSpFip(null, null, ['sp_fip'], [])).toBe(false);
    });
  });

  describe('FIP 색상 분류', () => {
    it(`FIP < SP_FIP_STRONG(${SP_FIP_STRONG}) → brand`, () => {
      expect(classifyFip(2.80)).toBe('brand');
      expect(classifyFip(SP_FIP_STRONG - 0.01)).toBe('brand');
    });

    it(`FIP = SP_FIP_STRONG(${SP_FIP_STRONG}) → neutral`, () => {
      expect(classifyFip(SP_FIP_STRONG)).toBe('neutral');
    });

    it(`FIP > SP_FIP_WEAK(${SP_FIP_WEAK}) → orange`, () => {
      expect(classifyFip(5.20)).toBe('orange');
      expect(classifyFip(SP_FIP_WEAK + 0.01)).toBe('orange');
    });

    it(`FIP = SP_FIP_WEAK(${SP_FIP_WEAK}) → neutral`, () => {
      expect(classifyFip(SP_FIP_WEAK)).toBe('neutral');
    });

    it('중간 범위 FIP → neutral', () => {
      expect(classifyFip(3.8)).toBe('neutral');
      expect(classifyFip(4.2)).toBe('neutral');
    });
  });

  describe('실전 케이스', () => {
    it('강세 투수 vs 약세 투수 — 양쪽 색상 구분', () => {
      const homeFip = 2.95; // brand
      const awayFip = 5.10; // orange
      expect(classifyFip(homeFip)).toBe('brand');
      expect(classifyFip(awayFip)).toBe('orange');
    });

    it('두 투수 모두 강세 — 양쪽 brand', () => {
      expect(classifyFip(3.10)).toBe('brand');
      expect(classifyFip(3.40)).toBe('brand');
    });

    it('두 투수 모두 약세 — 양쪽 orange', () => {
      expect(classifyFip(4.80)).toBe('orange');
      expect(classifyFip(5.50)).toBe('orange');
    });
  });
});
