import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NEUTRAL_FACTOR, WINNER_PROB_CLAMP_MIN, WINNER_PROB_CLAMP_MAX, clampWinnerProb, DEFAULT_WEIGHTS } from '@moneyball/shared';
import { computeProb } from '../backtest/backtest-v2-helpers';

const BACKTEST_HELPERS_PATH = join(
  __dirname,
  '../backtest/backtest-v2-helpers.ts',
);

describe('silent drift wave-358 — backtest-v2-helpers.ts 단일 source 가드', () => {
  it('NEUTRAL_FACTOR = 0.5 단일 source (shared)', () => {
    expect(NEUTRAL_FACTOR).toBe(0.5);
  });

  it('backtest-v2-helpers.ts: 로컬 const NEUTRAL_FACTOR 정의 없음', () => {
    const src = readFileSync(BACKTEST_HELPERS_PATH, 'utf-8');
    const codeLines = src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
    const code = codeLines.join('\n');
    expect(code).not.toMatch(/const NEUTRAL_FACTOR\s*=/);
  });

  it('backtest-v2-helpers.ts: 로컬 CLAMP_LO/CLAMP_HI 정의 없음', () => {
    const src = readFileSync(BACKTEST_HELPERS_PATH, 'utf-8');
    expect(src).not.toMatch(/const CLAMP_LO\s*=/);
    expect(src).not.toMatch(/const CLAMP_HI\s*=/);
  });

  it('clampWinnerProb 경계값 검증 (0.15 / 0.85)', () => {
    expect(WINNER_PROB_CLAMP_MIN).toBe(0.15);
    expect(WINNER_PROB_CLAMP_MAX).toBe(0.85);
    expect(clampWinnerProb(0.0)).toBe(0.15);
    expect(clampWinnerProb(1.0)).toBe(0.85);
    expect(clampWinnerProb(0.5)).toBe(0.5);
  });

  it('computeProb neutral fallback: NEUTRAL_FACTOR 기준 동작', () => {
    const neutralFactors = {
      sp_fip: NEUTRAL_FACTOR,
      sp_xfip: NEUTRAL_FACTOR,
      lineup_woba: NEUTRAL_FACTOR,
      bullpen_fip: NEUTRAL_FACTOR,
      recent_form: NEUTRAL_FACTOR,
      war: NEUTRAL_FACTOR,
      head_to_head: NEUTRAL_FACTOR,
      park_factor: NEUTRAL_FACTOR,
      elo: NEUTRAL_FACTOR,
      sfr: NEUTRAL_FACTOR,
    };
    const prob = computeProb(neutralFactors, DEFAULT_WEIGHTS);
    expect(prob).not.toBeNull();
    // 모든 factor=0.5(NEUTRAL) + HOME_ADVANTAGE → prob > 0.5
    expect(prob!).toBeGreaterThan(0.5);
    expect(prob!).toBeLessThan(0.6);
  });
});
