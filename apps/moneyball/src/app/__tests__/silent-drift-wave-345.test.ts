import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WAR_STRONG, WAR_WEAK } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

describe('silent drift wave-345 — 팀 WAR 배지 단일 소스 (cycle 1682)', () => {
  it('WAR_STRONG = 20.0 (KBO 상위권 팀 시즌 누적 WAR 임계)', () => {
    expect(WAR_STRONG).toBe(20.0);
  });

  it('WAR_WEAK = 8.0 (KBO 하위권 팀 시즌 누적 WAR 임계)', () => {
    expect(WAR_WEAK).toBe(8.0);
  });

  it('analysis/page.tsx: imports WAR_STRONG and WAR_WEAK from shared', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('WAR_STRONG');
    expect(src).toContain('WAR_WEAK');
  });

  it('analysis/page.tsx: no hardcoded 20.0 WAR threshold', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).not.toMatch(/>=\s*20\.0/);
    expect(src).not.toMatch(/<=\s*8\.0/);
  });

  // cycle 1984 review-code(heavy): DB fetch 는 analysis/page.tsx 데이터 레이어 분리 리팩터로
  // analysis/analysis-data.ts 로 이동.
  it('analysis/analysis-data.ts: fetches home_war_total and away_war_total', () => {
    const src = readFileSync(join(ROOT, 'src/app/analysis/analysis-data.ts'), 'utf8');
    expect(src).toContain('home_war_total');
    expect(src).toContain('away_war_total');
  });

  it('analysis/page.tsx: maps homeWar and awayWar in TodayGameCard', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('homeWar');
    expect(src).toContain('awayWar');
  });

  it('analysis/page.tsx: renders wave-345 WAR badge section', () => {
    const src = readFileSync(ANALYSIS_PAGE, 'utf8');
    expect(src).toContain('wave-345');
  });
});
