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

  it('computeCompositeDuel.ts: wave-383 H2H 팩터 포함', () => {
    const src = readFileSync(join(__dirname, '../../../src/lib/analysis/computeCompositeDuel.ts'), 'utf8');
    expect(src).toContain('wave-383');
    expect(src).toContain('h2hResult');
    expect(src).toContain('H2H_DOMINANT_RATE');
    expect(src).toContain('H2H_WEAK_RATE');
    expect(src).toContain('g.h2hHomeWins !== undefined && g.h2hAwayWins !== undefined');
  });

  it('analysis/page.tsx: computeCompositeDuel 헬퍼 통해 H2H 팩터 사용', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('computeCompositeDuel');
    expect(src).toContain('h2hHomeWins: h2hHomeArg');
  });
});
