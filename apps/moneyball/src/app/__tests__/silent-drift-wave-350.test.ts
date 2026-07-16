import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WIN_PROB_DOMINANT_HI, WIN_PROB_DOMINANT_LO } from '@moneyball/shared';
import { buildGameOverview } from '@/lib/analysis/factor-explanations';

const ROOT = join(__dirname, '../../..');
const FACTOR_EXP = join(ROOT, 'src/lib/analysis/factor-explanations.ts');

describe('silent drift wave-350 — 우세 뚜렷 태그 단일 소스 (cycle 1687)', () => {
  it('WIN_PROB_DOMINANT_HI = 0.6 단일 소스 가드', () => {
    expect(WIN_PROB_DOMINANT_HI).toBe(0.6);
  });

  it('WIN_PROB_DOMINANT_LO = 0.4 단일 소스 가드', () => {
    expect(WIN_PROB_DOMINANT_LO).toBe(0.4);
  });

  it('factor-explanations.ts: WIN_PROB_DOMINANT_HI import from shared', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).toContain('WIN_PROB_DOMINANT_HI');
  });

  it('factor-explanations.ts: WIN_PROB_DOMINANT_LO import from shared', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).toContain('WIN_PROB_DOMINANT_LO');
  });

  it('factor-explanations.ts: 우세 뚜렷 비교에 하드코딩 0.6 / 0.4 없음', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).not.toMatch(/prob\s*>=\s*0\.6/);
    expect(src).not.toMatch(/prob\s*<=\s*0\.4/);
  });

  it('buildGameOverview: homeWinProb >= 0.6 → 우세 뚜렷 태그', () => {
    const result = buildGameOverview({
      homeWinProb: 0.65,
      homeTeamName: 'KT',
      awayTeamName: 'LG',
    });
    expect(result.tags).toContain('우세 뚜렷');
    expect(result.tags).not.toContain('박빙');
  });

  it('buildGameOverview: homeWinProb <= 0.4 → 우세 뚜렷 태그 (원정 우세)', () => {
    const result = buildGameOverview({
      homeWinProb: 0.35,
      homeTeamName: '두산',
      awayTeamName: '삼성',
    });
    expect(result.tags).toContain('우세 뚜렷');
  });

  it('buildGameOverview: homeWinProb == 0.6 → 우세 뚜렷 태그 (경계값)', () => {
    const result = buildGameOverview({
      homeWinProb: 0.6,
      homeTeamName: 'KIA',
      awayTeamName: 'SSG',
    });
    expect(result.tags).toContain('우세 뚜렷');
  });

  it('buildGameOverview: homeWinProb == 0.4 → 우세 뚜렷 태그 (경계값)', () => {
    const result = buildGameOverview({
      homeWinProb: 0.4,
      homeTeamName: 'NC',
      awayTeamName: '한화',
    });
    expect(result.tags).toContain('우세 뚜렷');
  });

  it('buildGameOverview: homeWinProb = 0.5 → 박빙 태그 (중립)', () => {
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeTeamName: '롯데',
      awayTeamName: '키움',
    });
    expect(result.tags).toContain('박빙');
    expect(result.tags).not.toContain('우세 뚜렷');
  });

  it('buildGameOverview: homeWinProb = 0.57 → 태그 없음 (중간 구간)', () => {
    const result = buildGameOverview({
      homeWinProb: 0.57,
      homeTeamName: 'KT',
      awayTeamName: 'LG',
    });
    expect(result.tags).not.toContain('우세 뚜렷');
    expect(result.tags).not.toContain('박빙');
  });
});
