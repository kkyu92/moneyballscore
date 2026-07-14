import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ELO_NEUTRAL_WIN_PCT, CLOSE_GAME_MARGIN } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const PKG_ROOT = join(ROOT, '../../packages');
const COMP_ROOT = join(ROOT, 'src/components');

describe('silent drift wave 315 — ELO_NEUTRAL_WIN_PCT + CLOSE_GAME_MARGIN single source (cycle 1646)', () => {
  it('ELO_NEUTRAL_WIN_PCT = 0.5 (중립 승률 baseline)', () => {
    expect(ELO_NEUTRAL_WIN_PCT).toBe(0.5);
  });

  it('CLOSE_GAME_MARGIN = 1 (1점 차 이내 접전 기준)', () => {
    expect(CLOSE_GAME_MARGIN).toBe(1);
  });

  it('analysis/page.tsx uses ELO_NEUTRAL_WIN_PCT (no inline >= 0.5 for homeWinProb)', () => {
    const src = readFileSync(join(ROOT, 'src/app/analysis/page.tsx'), 'utf8');
    expect(src).toContain('ELO_NEUTRAL_WIN_PCT');
    expect(src).not.toContain('homeWinProb >= 0.5');
    expect(src).not.toContain('modelHomeWinProb! >= 0.5');
  });

  it('GameAnalysisProse.tsx uses ELO_NEUTRAL_WIN_PCT (no inline 0.5)', () => {
    const src = readFileSync(join(COMP_ROOT, 'analysis/GameAnalysisProse.tsx'), 'utf8');
    expect(src).toContain('ELO_NEUTRAL_WIN_PCT');
    expect(src).not.toContain('homeWinProb > 0.5');
    expect(src).not.toContain('homeWinProb - 0.5');
  });

  it('TopStatPickCard.tsx uses ELO_NEUTRAL_WIN_PCT (no inline >= 0.5)', () => {
    const src = readFileSync(join(COMP_ROOT, 'predictions/TopStatPickCard.tsx'), 'utf8');
    expect(src).toContain('ELO_NEUTRAL_WIN_PCT');
    expect(src).not.toContain('>= 0.5');
  });

  it('judge-agent.ts uses ELO_NEUTRAL_WIN_PCT (no inline >= 0.5 for homeWinProb)', () => {
    const src = readFileSync(join(PKG_ROOT, 'kbo-data/src/agents/judge-agent.ts'), 'utf8');
    expect(src).toContain('ELO_NEUTRAL_WIN_PCT');
    expect(src).not.toContain('homeWinProb >= 0.5');
  });

  it('predictor.ts uses ELO_NEUTRAL_WIN_PCT (no inline 0.5 for winner/confidence)', () => {
    const src = readFileSync(join(PKG_ROOT, 'kbo-data/src/engine/predictor.ts'), 'utf8');
    expect(src).toContain('ELO_NEUTRAL_WIN_PCT');
    expect(src).not.toContain('homeWinProb >= 0.5');
    expect(src).not.toContain('homeWinProb - 0.5');
  });

  it('matchup page uses CLOSE_GAME_MARGIN (no inline <= 1 for score difference)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/matchup/[teamA]/[teamB]/page.tsx'),
      'utf8',
    );
    expect(src).toContain('CLOSE_GAME_MARGIN');
    expect(src).not.toContain('<= 1,');
    expect(src).not.toContain('margin <= 1;');
  });
});
