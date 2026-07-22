import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BULLPEN_FIP_STRONG, BULLPEN_FIP_WEAK } from '@moneyball/shared';
import { buildGameOverview } from '@/lib/analysis/factor-explanations';

const ROOT = join(__dirname, '../../..');
const FACTOR_EXP = join(ROOT, 'src/lib/analysis/factor-explanations.ts');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('silent drift wave-341 — 불펜 FIP 배지 single source (cycle 1676)', () => {
  it('BULLPEN_FIP_STRONG = 4.0 (KBO 강한 불펜 임계)', () => {
    expect(BULLPEN_FIP_STRONG).toBe(4.0);
  });

  it('BULLPEN_FIP_WEAK = 5.0 (KBO 약한 불펜 임계)', () => {
    expect(BULLPEN_FIP_WEAK).toBe(5.0);
  });

  it('factor-explanations.ts: imports BULLPEN_FIP_STRONG from shared', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).toContain('BULLPEN_FIP_STRONG');
  });

  it('factor-explanations.ts: no hardcoded 4.0 bullpen FIP threshold', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).not.toMatch(/diff\s*>=\s*1\.0.*4\.0/);
  });

  it('analysis/page.tsx: imports BULLPEN_FIP_STRONG and BULLPEN_FIP_WEAK', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('BULLPEN_FIP_STRONG');
    expect(src).toContain('BULLPEN_FIP_WEAK');
  });

  // cycle 1984 review-code(heavy): DB fetch 는 analysis/page.tsx 데이터 레이어 분리 리팩터로
  // analysis/analysis-data.ts 로 이동.
  it('analysis/analysis-data.ts: fetches home_bullpen_fip and away_bullpen_fip', () => {
    const src = readFileSync(join(ROOT, 'src/app/analysis/analysis-data.ts'), 'utf8');
    expect(src).toContain('home_bullpen_fip');
    expect(src).toContain('away_bullpen_fip');
  });

  it('buildGameOverview: 홈 불펜 FIP 우세(diff ≥ 1.0) → 홈팀 불펜 우세 태그', () => {
    const result = buildGameOverview({
      homeWinProb: 0.55,
      homeBullpenFip: 3.80,
      awayBullpenFip: 5.00,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags).toContain('KIA 불펜 우세');
  });

  it('buildGameOverview: 원정 불펜 FIP 우세(diff ≤ -1.0) → 원정팀 불펜 우세 태그', () => {
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

  it('buildGameOverview: bullpenFip null → 불펜 우세 태그 없음 (데이터 없음)', () => {
    const result = buildGameOverview({
      homeWinProb: 0.50,
      homeBullpenFip: null,
      awayBullpenFip: null,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags.some(t => t.includes('불펜 우세'))).toBe(false);
  });

  it('buildGameOverview: 기존 태그 회귀 — 불펜 우세와 타격전 예상 공존 가능', () => {
    const result = buildGameOverview({
      homeWinProb: 0.55,
      homeWoba: 0.35,
      awayWoba: 0.34,
      homeBullpenFip: 3.80,
      awayBullpenFip: 5.20,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags).toContain('타격전 예상');
    expect(result.tags).toContain('KIA 불펜 우세');
  });
});
