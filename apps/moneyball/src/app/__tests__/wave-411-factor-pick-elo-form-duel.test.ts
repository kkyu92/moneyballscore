import { describe, it, expect } from 'vitest';
import {
  ELO_NEUTRAL,
  ELO_DISPLAY_NEUTRAL_BAND,
  TEAM_STRENGTH_FORM_STRONG,
  TEAM_STRENGTH_FORM_WEAK,
} from '@moneyball/shared';

// wave-411: 팩터 수렴 픽 Elo + 최근폼 대결 표시
// analysis/page.tsx — factor pick 카드 elo / recent_form 조건부 렌더링 로직
//
// Elo 표시 조건:
//   1. pick.awayElo != null && pick.homeElo != null
//   2. 'elo' in favoredSlugs OR 'elo' in unfavoredSlugs
//
// 최근폼 표시 조건:
//   1. pick.awayRecentForm != null && pick.homeRecentForm != null
//   2. 'recent_form' in favoredSlugs OR 'recent_form' in unfavoredSlugs
//
// Elo 색상 분류:
//   Elo > ELO_NEUTRAL(1500) + ELO_DISPLAY_NEUTRAL_BAND(10) → brand color (강세)
//   Elo < ELO_NEUTRAL(1500) - ELO_DISPLAY_NEUTRAL_BAND(10) → orange color (약세)
//   그 외                                                   → gray (중립)
//
// 최근폼 색상 분류:
//   form >= TEAM_STRENGTH_FORM_STRONG(0.6) → brand color (강세)
//   form <= TEAM_STRENGTH_FORM_WEAK(0.4)  → orange color (약세)
//   그 외                                  → gray (중립)

function shouldShowElo(
  awayElo: number | null | undefined,
  homeElo: number | null | undefined,
  favoredSlugs: string[],
  unfavoredSlugs: string[],
): boolean {
  return (
    awayElo != null &&
    homeElo != null &&
    (favoredSlugs.includes('elo') || unfavoredSlugs.includes('elo'))
  );
}

function classifyElo(elo: number): 'brand' | 'orange' | 'neutral' {
  if (elo > ELO_NEUTRAL + ELO_DISPLAY_NEUTRAL_BAND) return 'brand';
  if (elo < ELO_NEUTRAL - ELO_DISPLAY_NEUTRAL_BAND) return 'orange';
  return 'neutral';
}

function shouldShowRecentForm(
  awayForm: number | null | undefined,
  homeForm: number | null | undefined,
  favoredSlugs: string[],
  unfavoredSlugs: string[],
): boolean {
  return (
    awayForm != null &&
    homeForm != null &&
    (favoredSlugs.includes('recent_form') || unfavoredSlugs.includes('recent_form'))
  );
}

function classifyRecentForm(form: number): 'brand' | 'orange' | 'neutral' {
  if (form >= TEAM_STRENGTH_FORM_STRONG) return 'brand';
  if (form <= TEAM_STRENGTH_FORM_WEAK) return 'orange';
  return 'neutral';
}

describe('wave-411: 팩터 수렴 픽 Elo 대결 표시', () => {
  describe('표시 조건', () => {
    it('양쪽 Elo 있고 elo 수렴 팩터 포함(favored) → 표시', () => {
      expect(shouldShowElo(1520, 1480, ['elo', 'sp_fip'], [])).toBe(true);
    });

    it('양쪽 Elo 있고 elo 비수렴 팩터 포함(unfavored) → 표시', () => {
      expect(shouldShowElo(1490, 1510, [], ['elo', 'recent_form'])).toBe(true);
    });

    it('Elo 있지만 elo 수렴 팩터 미포함 → 미표시', () => {
      expect(shouldShowElo(1520, 1480, ['sp_fip', 'recent_form'], ['lineup_woba'])).toBe(false);
    });

    it('awayElo null → 미표시', () => {
      expect(shouldShowElo(null, 1500, ['elo'], [])).toBe(false);
    });

    it('homeElo null → 미표시', () => {
      expect(shouldShowElo(1500, null, ['elo'], [])).toBe(false);
    });

    it('둘 다 null → 미표시', () => {
      expect(shouldShowElo(null, null, ['elo'], [])).toBe(false);
    });
  });

  describe('Elo 색상 분류', () => {
    it(`Elo > ${ELO_NEUTRAL + ELO_DISPLAY_NEUTRAL_BAND} → brand (강세)`, () => {
      expect(classifyElo(ELO_NEUTRAL + ELO_DISPLAY_NEUTRAL_BAND + 1)).toBe('brand');
      expect(classifyElo(1550)).toBe('brand');
    });

    it(`Elo = ${ELO_NEUTRAL + ELO_DISPLAY_NEUTRAL_BAND} → neutral (경계값)`, () => {
      expect(classifyElo(ELO_NEUTRAL + ELO_DISPLAY_NEUTRAL_BAND)).toBe('neutral');
    });

    it(`Elo < ${ELO_NEUTRAL - ELO_DISPLAY_NEUTRAL_BAND} → orange (약세)`, () => {
      expect(classifyElo(ELO_NEUTRAL - ELO_DISPLAY_NEUTRAL_BAND - 1)).toBe('orange');
      expect(classifyElo(1450)).toBe('orange');
    });

    it(`Elo = ${ELO_NEUTRAL - ELO_DISPLAY_NEUTRAL_BAND} → neutral (경계값)`, () => {
      expect(classifyElo(ELO_NEUTRAL - ELO_DISPLAY_NEUTRAL_BAND)).toBe('neutral');
    });

    it(`Elo = ELO_NEUTRAL(${ELO_NEUTRAL}) → neutral`, () => {
      expect(classifyElo(ELO_NEUTRAL)).toBe('neutral');
    });
  });

  describe('실전 케이스', () => {
    it('강세 팀 vs 약세 팀 — 양쪽 색상 구분', () => {
      expect(classifyElo(1530)).toBe('brand');
      expect(classifyElo(1470)).toBe('orange');
    });

    it('두 팀 모두 중립 — 양쪽 neutral', () => {
      expect(classifyElo(1505)).toBe('neutral');
      expect(classifyElo(1495)).toBe('neutral');
    });
  });
});

describe('wave-411: 팩터 수렴 픽 최근폼 대결 표시', () => {
  describe('표시 조건', () => {
    it('양쪽 최근폼 있고 recent_form 수렴 팩터 포함(favored) → 표시', () => {
      expect(shouldShowRecentForm(0.65, 0.45, ['recent_form', 'elo'], [])).toBe(true);
    });

    it('양쪽 최근폼 있고 recent_form 비수렴 팩터 포함(unfavored) → 표시', () => {
      expect(shouldShowRecentForm(0.55, 0.38, [], ['recent_form'])).toBe(true);
    });

    it('최근폼 있지만 recent_form 수렴 팩터 미포함 → 미표시', () => {
      expect(shouldShowRecentForm(0.65, 0.45, ['elo', 'sp_fip'], ['lineup_woba'])).toBe(false);
    });

    it('awayRecentForm null → 미표시', () => {
      expect(shouldShowRecentForm(null, 0.5, ['recent_form'], [])).toBe(false);
    });

    it('homeRecentForm null → 미표시', () => {
      expect(shouldShowRecentForm(0.5, null, ['recent_form'], [])).toBe(false);
    });

    it('둘 다 null → 미표시', () => {
      expect(shouldShowRecentForm(null, null, ['recent_form'], [])).toBe(false);
    });
  });

  describe('최근폼 색상 분류', () => {
    it(`form >= TEAM_STRENGTH_FORM_STRONG(${TEAM_STRENGTH_FORM_STRONG}) → brand (강세)`, () => {
      expect(classifyRecentForm(TEAM_STRENGTH_FORM_STRONG)).toBe('brand');
      expect(classifyRecentForm(TEAM_STRENGTH_FORM_STRONG + 0.05)).toBe('brand');
      expect(classifyRecentForm(0.70)).toBe('brand');
    });

    it(`form <= TEAM_STRENGTH_FORM_WEAK(${TEAM_STRENGTH_FORM_WEAK}) → orange (약세)`, () => {
      expect(classifyRecentForm(TEAM_STRENGTH_FORM_WEAK)).toBe('orange');
      expect(classifyRecentForm(TEAM_STRENGTH_FORM_WEAK - 0.05)).toBe('orange');
      expect(classifyRecentForm(0.30)).toBe('orange');
    });

    it('중간 범위 최근폼 → neutral', () => {
      expect(classifyRecentForm(0.50)).toBe('neutral');
      expect(classifyRecentForm(0.55)).toBe('neutral');
      expect(classifyRecentForm(0.45)).toBe('neutral');
    });
  });

  describe('실전 케이스', () => {
    it('강세 팀 vs 약세 팀 — 양쪽 색상 구분', () => {
      expect(classifyRecentForm(0.70)).toBe('brand');
      expect(classifyRecentForm(0.35)).toBe('orange');
    });

    it('두 팀 모두 강세 — 양쪽 brand', () => {
      expect(classifyRecentForm(0.60)).toBe('brand');
      expect(classifyRecentForm(0.75)).toBe('brand');
    });

    it('두 팀 모두 약세 — 양쪽 orange', () => {
      expect(classifyRecentForm(0.40)).toBe('orange');
      expect(classifyRecentForm(0.25)).toBe('orange');
    });
  });
});
