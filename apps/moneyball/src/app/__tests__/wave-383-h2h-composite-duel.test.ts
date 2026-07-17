import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  H2H_DOMINANT_RATE,
  H2H_WEAK_RATE,
  H2H_MIN_GAMES,
} from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

/** 8팩터 COMPOSITE_DUEL H2H 팩터 로직 재현 */
function computeH2hResult(
  h2hHomeWins: number | undefined,
  h2hAwayWins: number | undefined,
): 'home' | 'away' | null {
  if (h2hHomeWins === undefined || h2hAwayWins === undefined) return null;
  const homeRate = h2hHomeWins / (h2hHomeWins + h2hAwayWins);
  if (homeRate >= H2H_DOMINANT_RATE) return 'home';
  if (homeRate <= H2H_WEAK_RATE) return 'away';
  return null;
}

describe('wave-383 — COMPOSITE_DUEL 상대전적 8팩터 편입 (cycle 1725)', () => {
  it('H2H_DOMINANT_RATE = 0.6', () => {
    expect(H2H_DOMINANT_RATE).toBe(0.6);
  });

  it('H2H_WEAK_RATE = 0.4', () => {
    expect(H2H_WEAK_RATE).toBe(0.4);
  });

  it('H2H_MIN_GAMES = 3', () => {
    expect(H2H_MIN_GAMES).toBe(3);
  });

  it('홈팀 3승0패 → homeRate=1.0 → home', () => {
    expect(computeH2hResult(3, 0)).toBe('home');
  });

  it('홈팀 0승3패 → homeRate=0.0 → away', () => {
    expect(computeH2hResult(0, 3)).toBe('away');
  });

  it('홈팀 2승2패 → homeRate=0.5 → null (중립)', () => {
    expect(computeH2hResult(2, 2)).toBeNull();
  });

  it('홈팀 3승2패 → homeRate=0.6 = H2H_DOMINANT_RATE → home (경계값)', () => {
    expect(computeH2hResult(3, 2)).toBe('home');
  });

  it('홈팀 2승3패 → homeRate=0.4 = H2H_WEAK_RATE → away (경계값)', () => {
    expect(computeH2hResult(2, 3)).toBe('away');
  });

  it('h2hHomeWins=undefined → null (데이터 부재)', () => {
    expect(computeH2hResult(undefined, undefined)).toBeNull();
  });

  it('h2hHomeWins=undefined (min games 미달 — page.tsx 가 undefined 전달) → null', () => {
    expect(computeH2hResult(undefined, 5)).toBeNull();
  });

  it('analysis/page.tsx: wave-383 comment 존재', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-383');
    expect(src).toContain('상대전적 추가');
  });

  it('analysis/page.tsx: 8팩터 언급', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('8팩터');
  });

  it('analysis/page.tsx: h2hResult 존재', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('h2hResult');
  });

  it('analysis/page.tsx: H2H_DOMINANT_RATE 사용 (COMPOSITE_DUEL 내)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('H2H_DOMINANT_RATE');
    expect(src).toContain('H2H_WEAK_RATE');
  });

  it('analysis/page.tsx: h2hHomeWins/h2hAwayWins validCount 조건 존재', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('g.h2hHomeWins !== undefined && g.h2hAwayWins !== undefined');
  });

  it('results 배열이 8 팩터 (woba/sfr/bullpen/spfip/war/elo/form/h2h)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wobaResult, sfrResult, bullpenResult, spFipResult, warResult, eloResult, formResult, h2hResult');
  });
});
