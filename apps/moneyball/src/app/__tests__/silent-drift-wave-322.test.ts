import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ELO_NEUTRAL_WIN_PCT, NEUTRAL_FACTOR } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');
const GAME_PAGE = join(ROOT, 'src/app/analysis/game/[id]/page.tsx');

describe('silent drift wave 322 — NEUTRAL_FACTOR + ELO_NEUTRAL_WIN_PCT single source (cycle 1654)', () => {
  it('NEUTRAL_FACTOR = 0.5 (factor 중립 기준)', () => {
    expect(NEUTRAL_FACTOR).toBe(0.5);
  });

  it('ELO_NEUTRAL_WIN_PCT = 0.5 (confidence / homeWinProb 중립 기준)', () => {
    expect(ELO_NEUTRAL_WIN_PCT).toBe(0.5);
  });

  it('analysis/page.tsx: factor impact 계산에 NEUTRAL_FACTOR 사용 (no hardcoded 0.5)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('NEUTRAL_FACTOR');
    expect(src).not.toMatch(/\(val as number\) - 0\.5/);
    expect(src).not.toMatch(/\(val as number\) > 0\.5/);
  });

  it('analysis/page.tsx: confidence fallback에 ELO_NEUTRAL_WIN_PCT 사용 (no hardcoded 0.5)', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).not.toMatch(/confidence:.*\?\? 0\.5/);
  });

  it('analysis/game/[id]/page.tsx: homeWinProbForOverview fallback에 ELO_NEUTRAL_WIN_PCT 사용', () => {
    const src = readFileSync(GAME_PAGE, 'utf8');
    expect(src).toContain('ELO_NEUTRAL_WIN_PCT');
    expect(src).not.toMatch(/homeWinProb \?\? 0\.5/);
  });
});
