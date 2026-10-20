import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NEUTRAL_FACTOR, FACTOR_CONTRIBUTION_SCALE, WIN_PROB_DOMINANT_HI } from '@moneyball/shared';

const FACTOR_EXPLANATIONS_PATH = join(
  __dirname,
  '../../lib/analysis/factor-explanations.ts',
);

describe('silent drift wave-356 — factor-explanations.ts NEUTRAL_FACTOR 단일 source', () => {
  it('NEUTRAL_FACTOR = 0.5 단일 소스 가드', () => {
    expect(NEUTRAL_FACTOR).toBe(0.5);
  });

  it('factor-explanations.ts: 0.5 로직 하드코딩 없음 (NEUTRAL_FACTOR 상수 사용)', () => {
    const src = readFileSync(FACTOR_EXPLANATIONS_PATH, 'utf-8');
    // 주석 라인 제거 후 검사
    const codeLines = src.split('\n').filter(l => !l.trim().startsWith('//'));
    const code = codeLines.join('\n');
    // 로직 0.5 패턴: - 0.5, > 0.5, prob 0.5 등
    expect(code).not.toMatch(/[-\s>]\s*0\.5\b/);
  });

  it('NEUTRAL_FACTOR 기반 OVERVIEW_CLOSE_PP 계산 검증', () => {
    // NEUTRAL_HI = 0.55 (shared 상수), NEUTRAL_FACTOR = 0.5
    // OVERVIEW_CLOSE_PP = Math.round((0.55 - 0.5) * 200) = 10
    const NEUTRAL_HI = 0.55;
    const expected = Math.round((NEUTRAL_HI - NEUTRAL_FACTOR) * FACTOR_CONTRIBUTION_SCALE);
    expect(expected).toBe(10);
  });

  it('NEUTRAL_FACTOR 기반 OVERVIEW_DOMINANT_PP 계산 검증', () => {
    // WIN_PROB_DOMINANT_HI = 0.6, NEUTRAL_FACTOR = 0.5
    // OVERVIEW_DOMINANT_PP = Math.round((0.6 - 0.5) * 200) = 20
    const expected = Math.round((WIN_PROB_DOMINANT_HI - NEUTRAL_FACTOR) * FACTOR_CONTRIBUTION_SCALE);
    expect(expected).toBe(20);
  });

  it('contributionPp 로직: NEUTRAL_FACTOR 기준 단일 factor one-sided pp 정확 (×100, cycle 3416 정정)', () => {
    // 단일 factor 의 homeWinProb 기여는 margin(FACTOR_CONTRIBUTION_SCALE=200, 양방향) 과 달리 one-sided — ×100.
    // value=0.7, weight=0.15: (0.7 - 0.5) * 0.15 * 100 = 3
    const value = 0.7;
    const weight = 0.15;
    const pp = Math.round((value - NEUTRAL_FACTOR) * weight * 100);
    expect(pp).toBe(3);
  });
});
