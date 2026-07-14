import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ELO_DIVIDER, KBO_TEAM_COUNT } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const PKG_ROOT = join(ROOT, '../../packages');

describe('silent drift wave 312 — ELO_DIVIDER single source (cycle 1643)', () => {
  it('ELO_DIVIDER = 400 (표준 Elo scale factor)', () => {
    expect(ELO_DIVIDER).toBe(400);
  });

  it('analysis/page.tsx uses ELO_DIVIDER (no inline 400)', () => {
    const src = readFileSync(join(ROOT, 'src/app/analysis/page.tsx'), 'utf8');
    expect(src).toContain('ELO_DIVIDER');
    expect(src).not.toMatch(/\/ 400[^;]/);
    expect(src).not.toMatch(/\/ 400;/);
  });

  it('analysis/page.tsx uses KBO_TEAM_COUNT (no inline 10 team count)', () => {
    const src = readFileSync(join(ROOT, 'src/app/analysis/page.tsx'), 'utf8');
    expect(src).toContain('KBO_TEAM_COUNT');
    expect(src).not.toContain('eloMap.size >= 10');
  });

  it('page.tsx (home) uses ELO_DIVIDER (no inline 400)', () => {
    const src = readFileSync(join(ROOT, 'src/app/page.tsx'), 'utf8');
    expect(src).toContain('ELO_DIVIDER');
    expect(src).not.toMatch(/HOME_ELO_BONUS\) \/ 400/);
  });

  it('backtest-v2-helpers.ts uses ELO_DIVIDER', () => {
    const src = readFileSync(
      join(PKG_ROOT, 'kbo-data/src/backtest/backtest-v2-helpers.ts'),
      'utf8',
    );
    expect(src).toContain('ELO_DIVIDER');
    expect(src).not.toMatch(/adjustedDiff \/ 400/);
  });

  it('models.ts uses ELO_DIVIDER (no inline 400)', () => {
    const src = readFileSync(join(PKG_ROOT, 'kbo-data/src/backtest/models.ts'), 'utf8');
    expect(src).toContain('ELO_DIVIDER');
    expect(src).not.toMatch(/\/ 400\b/);
  });

  it('logistic.ts uses ELO_DIVIDER (no inline 400)', () => {
    const src = readFileSync(join(PKG_ROOT, 'kbo-data/src/backtest/logistic.ts'), 'utf8');
    expect(src).toContain('ELO_DIVIDER');
    expect(src).not.toMatch(/\) \/ 400\b/);
  });

  it('mlb-base.ts uses ELO_DIVIDER (no inline 400)', () => {
    const src = readFileSync(join(PKG_ROOT, 'kbo-data/src/factors/mlb-base.ts'), 'utf8');
    expect(src).toContain('ELO_DIVIDER');
    expect(src).not.toMatch(/\) \/ 400\b/);
  });

  it('KBO_TEAM_COUNT = 10 (consistent)', () => {
    expect(KBO_TEAM_COUNT).toBe(10);
  });
});
