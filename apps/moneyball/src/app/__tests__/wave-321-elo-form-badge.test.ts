import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ELO_DISPLAY_NEUTRAL_BAND,
  TEAM_STRENGTH_FORM_STRONG,
  TEAM_STRENGTH_FORM_WEAK,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('wave-321 — Elo & 폼 비교 배지 (cycle 1653)', () => {
  it('ELO_DISPLAY_NEUTRAL_BAND = 10 (Elo 균형 판정 범위)', () => {
    expect(ELO_DISPLAY_NEUTRAL_BAND).toBe(10);
  });

  it('TEAM_STRENGTH_FORM_STRONG = 0.6 (강세 폼 임계)', () => {
    expect(TEAM_STRENGTH_FORM_STRONG).toBe(0.6);
  });

  it('TEAM_STRENGTH_FORM_WEAK = 0.4 (약세 폼 임계)', () => {
    expect(TEAM_STRENGTH_FORM_WEAK).toBe(0.4);
  });

  it('analysis/page.tsx: uses ELO_DISPLAY_NEUTRAL_BAND from shared (no hardcoded 10)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('ELO_DISPLAY_NEUTRAL_BAND');
    expect(src).not.toMatch(/absEloDelta <= 10\b/);
    expect(src).not.toMatch(/eloDelta > 10\b/);
  });

  it('analysis/page.tsx: uses TEAM_STRENGTH_FORM_STRONG / WEAK (no hardcoded 0.6 / 0.4)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('TEAM_STRENGTH_FORM_STRONG');
    expect(src).toContain('TEAM_STRENGTH_FORM_WEAK');
    expect(src).not.toMatch(/homeForm >= 0\.6\b/);
    expect(src).not.toMatch(/homeForm <= 0\.4\b/);
    expect(src).not.toMatch(/awayForm >= 0\.6\b/);
    expect(src).not.toMatch(/awayForm <= 0\.4\b/);
  });

  it('analysis/page.tsx: wave-321 homeElo/awayElo/homeRecentForm/awayRecentForm fields exist', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('homeElo');
    expect(src).toContain('awayElo');
    expect(src).toContain('homeRecentForm');
    expect(src).toContain('awayRecentForm');
    expect(src).toContain('wave-321');
  });
});
