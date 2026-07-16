import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BULLPEN_FIP_DIFF_MIN } from '@moneyball/shared';
import { buildGameOverview } from '@/lib/analysis/factor-explanations';

const ROOT = join(__dirname, '../../..');
const FACTOR_EXP = join(ROOT, 'src/lib/analysis/factor-explanations.ts');

describe('silent drift wave-342 — BULLPEN_FIP_DIFF_MIN 단일 소스 (cycle 1677)', () => {
  it('BULLPEN_FIP_DIFF_MIN = 1.0 (불펜 우세 판단 FIP 차이 임계)', () => {
    expect(BULLPEN_FIP_DIFF_MIN).toBe(1.0);
  });

  it('factor-explanations.ts: imports BULLPEN_FIP_DIFF_MIN from shared', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).toContain('BULLPEN_FIP_DIFF_MIN');
  });

  it('factor-explanations.ts: no hardcoded 1.0 bullpen FIP diff threshold', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).not.toMatch(/diff\s*>=\s*1\.0/);
    expect(src).not.toMatch(/diff\s*<=\s*-1\.0/);
  });

  it('buildGameOverview: 홈 불펜 FIP 차이 ≥ 1.0 → 홈팀 불펜 우세 태그', () => {
    const result = buildGameOverview({
      homeWinProb: 0.55,
      homeBullpenFip: 3.80,
      awayBullpenFip: 5.00,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags).toContain('KIA 불펜 우세');
  });

  it('buildGameOverview: 원정 불펜 FIP 차이 ≥ 1.0 → 원정팀 불펜 우세 태그', () => {
    const result = buildGameOverview({
      homeWinProb: 0.45,
      homeBullpenFip: 5.20,
      awayBullpenFip: 4.00,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags).toContain('NC 불펜 우세');
  });

  it('buildGameOverview: 불펜 FIP 차이 < 1.0 → 불펜 우세 태그 없음', () => {
    const result = buildGameOverview({
      homeWinProb: 0.52,
      homeBullpenFip: 4.40,
      awayBullpenFip: 4.80,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags.some(t => t.includes('불펜 우세'))).toBe(false);
  });

  it('buildGameOverview: bullpenFip null → 불펜 우세 태그 없음', () => {
    const result = buildGameOverview({
      homeWinProb: 0.50,
      homeBullpenFip: null,
      awayBullpenFip: null,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags.some(t => t.includes('불펜 우세'))).toBe(false);
  });
});
