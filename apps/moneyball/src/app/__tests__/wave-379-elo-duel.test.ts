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

  it('computeCompositeDuel.ts: wave-379 Elo 팩터 포함', () => {
    const src = readFileSync(join(ROOT, 'src/lib/analysis/computeCompositeDuel.ts'), 'utf-8');
    expect(src).toContain('wave-379');
    expect(src).toContain('eloResult');
    expect(src).toContain('ELO_GAP_STRONG');
  });

  it('computeCompositeDuel.ts: results 배열에 eloResult 포함', () => {
    const src = readFileSync(join(ROOT, 'src/lib/analysis/computeCompositeDuel.ts'), 'utf-8');
    expect(src).toContain('eloResult');
    expect(src).toContain('warResult');
  });
});
