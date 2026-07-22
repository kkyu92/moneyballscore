import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SFR_STRONG, SFR_WEAK } from '@moneyball/shared';
import { explainFactor } from '@/lib/analysis/factor-explanations';

const ROOT = join(__dirname, '../../..');
const FACTOR_EXP = join(ROOT, 'src/lib/analysis/factor-explanations.ts');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('silent drift wave-343 — 수비 SFR 배지 단일 소스 (cycle 1678)', () => {
  it('SFR_STRONG = 10.0 (KBO 강세 수비 임계)', () => {
    expect(SFR_STRONG).toBe(10.0);
  });

  it('SFR_WEAK = -10.0 (KBO 약세 수비 임계)', () => {
    expect(SFR_WEAK).toBe(-10.0);
  });

  it('factor-explanations.ts: imports SFR_STRONG and SFR_WEAK from shared', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).toContain('SFR_STRONG');
    expect(src).toContain('SFR_WEAK');
  });

  it('factor-explanations.ts: no hardcoded 10.0 sfr threshold', () => {
    const src = readFileSync(FACTOR_EXP, 'utf8');
    expect(src).not.toMatch(/>=\s*10\.0/);
    expect(src).not.toMatch(/<=\s*-10\.0/);
  });

  it('analysis/page.tsx: imports SFR_STRONG and SFR_WEAK from shared', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('SFR_STRONG');
    expect(src).toContain('SFR_WEAK');
  });

  // cycle 1984 review-code(heavy): DB fetch 는 analysis/page.tsx 데이터 레이어 분리 리팩터로
  // analysis/analysis-data.ts 로 이동.
  it('analysis/analysis-data.ts: fetches home_sfr and away_sfr', () => {
    const src = readFileSync(join(ROOT, 'src/app/analysis/analysis-data.ts'), 'utf8');
    expect(src).toContain('home_sfr');
    expect(src).toContain('away_sfr');
  });

  it('explainFactor sfr: 강세 수비 (betterSfr ≥ 10) → "(강세 수비)" 포함', () => {
    const result = explainFactor({
      key: 'sfr',
      factorValue: 0.7,
      details: { awaySfr: 12.5, homeSfr: 5.0 },
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.narrative).toContain('강세 수비');
  });

  it('explainFactor sfr: 약세 수비 (betterSfr ≤ -10) → "(약세 수비)" 포함', () => {
    const result = explainFactor({
      key: 'sfr',
      factorValue: 0.3,
      details: { awaySfr: -3.0, homeSfr: -11.0 },
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.narrative).toContain('약세 수비');
  });

  it('explainFactor sfr: 중간 수비 → 강/약세 태그 없음', () => {
    const result = explainFactor({
      key: 'sfr',
      factorValue: 0.65,
      details: { awaySfr: 7.0, homeSfr: 2.0 },
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.narrative).not.toContain('강세 수비');
    expect(result.narrative).not.toContain('약세 수비');
  });

  it('explainFactor sfr: neutral (factorValue ~0.5) → "수비 SFR 차이 미미."', () => {
    const result = explainFactor({
      key: 'sfr',
      factorValue: 0.5,
      details: { awaySfr: 5.0, homeSfr: 4.5 },
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.narrative).toBe('수비 SFR 차이 미미.');
  });
});
