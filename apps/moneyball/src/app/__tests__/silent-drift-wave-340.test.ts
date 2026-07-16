import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LINEUP_WOBA_WEAK_TAG } from '@moneyball/shared';
import { buildGameOverview } from '@/lib/analysis/factor-explanations';

const ROOT = join(__dirname, '../../..');
const FACTOR_EXP = join(ROOT, 'src/lib/analysis/factor-explanations.ts');

describe('silent drift wave-340 — LINEUP_WOBA_WEAK_TAG 저득점 예상 태그 single source (cycle 1675)', () => {
  it('LINEUP_WOBA_WEAK_TAG = 0.30 (KBO 하위 타선 임계)', () => {
    expect(LINEUP_WOBA_WEAK_TAG).toBe(0.30);
  });

  it('factor-explanations.ts: imports LINEUP_WOBA_WEAK_TAG from shared', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).toContain('LINEUP_WOBA_WEAK_TAG');
  });

  it('factor-explanations.ts: no hardcoded 0.30 wOBA threshold', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).not.toMatch(/avgWoba\s*<=\s*0\.30/);
    expect(src).not.toMatch(/avgWoba\s*<\s*0\.30/);
  });

  it('buildGameOverview: avgWoba ≤ 0.30 → "저득점 예상" 태그', () => {
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeWoba: 0.29,
      awayWoba: 0.30,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags).toContain('저득점 예상');
  });

  it('buildGameOverview: avgWoba 0.31 (중간) → "저득점 예상" 태그 없음', () => {
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeWoba: 0.31,
      awayWoba: 0.31,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags).not.toContain('저득점 예상');
  });

  it('buildGameOverview: avgWoba ≥ 0.34 → "타격전 예상" 태그 (기존 태그 회귀)', () => {
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeWoba: 0.35,
      awayWoba: 0.34,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags).toContain('타격전 예상');
    expect(result.tags).not.toContain('저득점 예상');
  });
});
