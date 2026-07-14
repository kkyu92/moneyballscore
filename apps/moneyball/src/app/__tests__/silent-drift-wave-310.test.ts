import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { confToWinProb } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');

describe('silent drift wave 310 — confToWinProb single source (cycle 1641)', () => {
  it('confToWinProb(0) === 0.5 (중립)', () => {
    expect(confToWinProb(0)).toBe(0.5);
  });

  it('confToWinProb(1) === 1.0 (최고 신뢰)', () => {
    expect(confToWinProb(1)).toBe(1.0);
  });

  it('confToWinProb(0.5) === 0.75', () => {
    expect(confToWinProb(0.5)).toBe(0.75);
  });

  it('matchup/[teamA]/[teamB]/page.tsx uses confToWinProb (no inline 0.5 + confidence / 2)', () => {
    const src = readFileSync(join(ROOT, 'src/app/matchup/[teamA]/[teamB]/page.tsx'), 'utf8');
    expect(src).toContain('confToWinProb');
    expect(src).not.toMatch(/0\.5 \+ .*confidence \/ 2/);
  });

  it('feed/route.ts uses confToWinProb', () => {
    const src = readFileSync(join(ROOT, 'src/app/feed/route.ts'), 'utf8');
    expect(src).toContain('confToWinProb');
    expect(src).not.toMatch(/0\.5 \+ .*confidence \/ 2/);
  });

  it('teams/[code]/page.tsx uses confToWinProb', () => {
    const src = readFileSync(join(ROOT, 'src/app/teams/[code]/page.tsx'), 'utf8');
    expect(src).toContain('confToWinProb');
    expect(src).not.toMatch(/0\.5 \+ .*confidence \/ 2/);
  });

  it('teams/[code]/recent/page.tsx uses confToWinProb', () => {
    const src = readFileSync(join(ROOT, 'src/app/teams/[code]/recent/page.tsx'), 'utf8');
    expect(src).toContain('confToWinProb');
    expect(src).not.toMatch(/0\.5 \+ .*confidence \/ 2/);
  });

  it('en/mlb/team/[code]/page.tsx uses confToWinProb', () => {
    const src = readFileSync(join(ROOT, 'src/app/en/mlb/team/[code]/page.tsx'), 'utf8');
    expect(src).toContain('confToWinProb');
    expect(src).not.toMatch(/0\.5 \+ .*confidence \/ 2/);
  });

  it('mlb/team/[code]/page.tsx uses confToWinProb', () => {
    const src = readFileSync(join(ROOT, 'src/app/mlb/team/[code]/page.tsx'), 'utf8');
    expect(src).toContain('confToWinProb');
    expect(src).not.toMatch(/0\.5 \+ .*confidence \/ 2/);
  });

  it('components/predictions/PredictionCard.tsx uses confToWinProb', () => {
    const src = readFileSync(join(ROOT, 'src/components/predictions/PredictionCard.tsx'), 'utf8');
    expect(src).toContain('confToWinProb');
    expect(src).not.toMatch(/0\.5 \+ confidence \/ 2/);
  });
});
