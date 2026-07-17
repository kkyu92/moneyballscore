import { describe, it, expect } from 'vitest';
import { BULLPEN_FIP_STRONG, BULLPEN_FIP_WEAK, LINEUP_WOBA_STRONG_TAG, LINEUP_WOBA_WEAK_TAG } from '@moneyball/shared';

// wave-409: 팩터 수렴 픽 불펜 FIP + 타선 wOBA 대결 표시
// analysis/page.tsx — factor pick 카드 bullpen_fip / lineup_woba 조건부 렌더링 로직
//
// 불펜 FIP 표시 조건:
//   1. pick.homeBullpenFip != null && pick.awayBullpenFip != null
//   2. 'bullpen_fip' in favoredSlugs OR 'bullpen_fip' in unfavoredSlugs
//
// 타선 wOBA 표시 조건:
//   1. pick.awayLineupWoba != null && pick.homeLineupWoba != null
//   2. 'lineup_woba' in favoredSlugs OR 'lineup_woba' in unfavoredSlugs
//
// 불펜 FIP 색상 분류:
//   FIP < BULLPEN_FIP_STRONG(4.0) → brand color (강세)
//   FIP > BULLPEN_FIP_WEAK(5.0)  → orange color (약세)
//   그 외                         → gray (중립)
//
// 타선 wOBA 색상 분류:
//   wOBA >= LINEUP_WOBA_STRONG_TAG(0.34) → brand color (강세)
//   wOBA <= LINEUP_WOBA_WEAK_TAG(0.30)  → orange color (약세)
//   그 외                                → gray (중립)

function shouldShowBullpenFip(
  homeFip: number | null | undefined,
  awayFip: number | null | undefined,
  favoredSlugs: string[],
  unfavoredSlugs: string[],
): boolean {
  return (
    homeFip != null &&
    awayFip != null &&
    (favoredSlugs.includes('bullpen_fip') || unfavoredSlugs.includes('bullpen_fip'))
  );
}

function classifyBullpenFip(fip: number): 'brand' | 'orange' | 'neutral' {
  if (fip < BULLPEN_FIP_STRONG) return 'brand';
  if (fip > BULLPEN_FIP_WEAK) return 'orange';
  return 'neutral';
}

function shouldShowLineupWoba(
  awayWoba: number | null | undefined,
  homeWoba: number | null | undefined,
  favoredSlugs: string[],
  unfavoredSlugs: string[],
): boolean {
  return (
    awayWoba != null &&
    homeWoba != null &&
    (favoredSlugs.includes('lineup_woba') || unfavoredSlugs.includes('lineup_woba'))
  );
}

function classifyWoba(woba: number): 'brand' | 'orange' | 'neutral' {
  if (woba >= LINEUP_WOBA_STRONG_TAG) return 'brand';
  if (woba <= LINEUP_WOBA_WEAK_TAG) return 'orange';
  return 'neutral';
}

describe('wave-409: 팩터 수렴 픽 불펜 FIP 대결 표시', () => {
  describe('표시 조건', () => {
    it('양쪽 FIP 있고 bullpen_fip 수렴 팩터 포함(favored) → 표시', () => {
      expect(shouldShowBullpenFip(3.8, 5.2, ['bullpen_fip', 'elo'], [])).toBe(true);
    });

    it('양쪽 FIP 있고 bullpen_fip 비수렴 팩터 포함(unfavored) → 표시', () => {
      expect(shouldShowBullpenFip(4.1, 4.3, [], ['bullpen_fip', 'recent_form'])).toBe(true);
    });

    it('FIP 있지만 bullpen_fip 수렴 팩터 미포함 → 미표시', () => {
      expect(shouldShowBullpenFip(3.8, 4.2, ['elo', 'sp_fip'], ['recent_form'])).toBe(false);
    });

    it('homeBullpenFip null → 미표시', () => {
      expect(shouldShowBullpenFip(null, 4.2, ['bullpen_fip'], [])).toBe(false);
    });

    it('awayBullpenFip null → 미표시', () => {
      expect(shouldShowBullpenFip(3.8, null, ['bullpen_fip'], [])).toBe(false);
    });
  });

  describe('색상 분류', () => {
    it(`FIP < ${BULLPEN_FIP_STRONG} → brand (강세)`, () => {
      expect(classifyBullpenFip(BULLPEN_FIP_STRONG - 0.1)).toBe('brand');
    });

    it(`FIP > ${BULLPEN_FIP_WEAK} → orange (약세)`, () => {
      expect(classifyBullpenFip(BULLPEN_FIP_WEAK + 0.1)).toBe('orange');
    });

    it(`FIP = ${BULLPEN_FIP_STRONG} → neutral (경계값)`, () => {
      expect(classifyBullpenFip(BULLPEN_FIP_STRONG)).toBe('neutral');
    });

    it(`FIP = ${BULLPEN_FIP_WEAK} → neutral (경계값)`, () => {
      expect(classifyBullpenFip(BULLPEN_FIP_WEAK)).toBe('neutral');
    });

    it('FIP 사이 값 → neutral', () => {
      expect(classifyBullpenFip(4.5)).toBe('neutral');
    });
  });
});

describe('wave-409: 팩터 수렴 픽 타선 wOBA 대결 표시', () => {
  describe('표시 조건', () => {
    it('양쪽 wOBA 있고 lineup_woba 수렴 팩터 포함(favored) → 표시', () => {
      expect(shouldShowLineupWoba(0.32, 0.35, ['lineup_woba', 'elo'], [])).toBe(true);
    });

    it('양쪽 wOBA 있고 lineup_woba 비수렴 팩터 포함(unfavored) → 표시', () => {
      expect(shouldShowLineupWoba(0.31, 0.29, [], ['lineup_woba'])).toBe(true);
    });

    it('wOBA 있지만 lineup_woba 수렴 팩터 미포함 → 미표시', () => {
      expect(shouldShowLineupWoba(0.32, 0.35, ['elo', 'bullpen_fip'], ['recent_form'])).toBe(false);
    });

    it('awayLineupWoba null → 미표시', () => {
      expect(shouldShowLineupWoba(null, 0.32, ['lineup_woba'], [])).toBe(false);
    });

    it('homeLineupWoba null → 미표시', () => {
      expect(shouldShowLineupWoba(0.34, null, ['lineup_woba'], [])).toBe(false);
    });
  });

  describe('색상 분류', () => {
    it(`wOBA >= ${LINEUP_WOBA_STRONG_TAG} → brand (강세)`, () => {
      expect(classifyWoba(LINEUP_WOBA_STRONG_TAG)).toBe('brand');
      expect(classifyWoba(LINEUP_WOBA_STRONG_TAG + 0.01)).toBe('brand');
    });

    it(`wOBA <= ${LINEUP_WOBA_WEAK_TAG} → orange (약세)`, () => {
      expect(classifyWoba(LINEUP_WOBA_WEAK_TAG)).toBe('orange');
      expect(classifyWoba(LINEUP_WOBA_WEAK_TAG - 0.01)).toBe('orange');
    });

    it('wOBA 사이 값 → neutral', () => {
      expect(classifyWoba(0.32)).toBe('neutral');
    });
  });
});
