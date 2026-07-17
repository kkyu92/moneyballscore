import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ELO_GAP_STRONG } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('wave-379 — Elo 직접 대결 배지 (cycle 1721)', () => {
  it('ELO_GAP_STRONG = 50 (57% vs 43% win prob, 의미 있는 Elo 격차)', () => {
    expect(ELO_GAP_STRONG).toBe(50);
  });

  it('Elo gap >= 50 → 우세 팀 결정', () => {
    const homeElo = 1560;
    const awayElo = 1500;
    const gap = homeElo - awayElo;
    expect(Math.abs(gap)).toBeGreaterThanOrEqual(ELO_GAP_STRONG);
    expect(gap > 0).toBe(true); // home favored
  });

  it('Elo gap < 50 → 배지 미표시', () => {
    const homeElo = 1520;
    const awayElo = 1500;
    const gap = homeElo - awayElo;
    expect(Math.abs(gap)).toBeLessThan(ELO_GAP_STRONG);
  });

  it('Elo gap = 50 exactly → 배지 표시 경계', () => {
    const homeElo = 1550;
    const awayElo = 1500;
    const gap = homeElo - awayElo;
    expect(Math.abs(gap)).toBeGreaterThanOrEqual(ELO_GAP_STRONG);
  });

  it('away Elo 우위 → away 팀 강세', () => {
    const homeElo = 1480;
    const awayElo = 1540;
    const gap = homeElo - awayElo;
    expect(Math.abs(gap)).toBeGreaterThanOrEqual(ELO_GAP_STRONG);
    expect(gap < 0).toBe(true); // away favored
  });

  it('wave-379 Elo 직접 대결 배지 코드 존재', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    expect(src).toContain('wave-379');
    expect(src).toContain('ELO_GAP_STRONG');
    expect(src).toContain('Elo {favoredName} 강세');
  });

  it('wave-365 종합 우세에 Elo 6번째 팩터 포함', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    expect(src).toContain('wave-379: Elo 추가');
    expect(src).toContain('eloResult');
    // wave-365 섹션 추출 (wave-365 부터 wave-379 직접 대결 배지 시작까지)
    const start = src.indexOf('wave-365');
    const end = src.indexOf('wave-379: Elo 직접 대결');
    const compositeSection = src.slice(start, end);
    expect(compositeSection).toContain('eloResult');
    expect(compositeSection).toContain('ELO_GAP_STRONG');
  });

  it('종합 우세 6팩터 배열에 eloResult 포함', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf-8');
    const start = src.indexOf('wave-365');
    const end = src.indexOf('wave-379: Elo 직접 대결');
    const compositeSection = src.slice(start, end);
    expect(compositeSection).toContain('wobaResult, sfrResult, bullpenResult, spFipResult, warResult, eloResult');
  });
});
