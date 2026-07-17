import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { computeCompositeDuel } from '@/lib/analysis/computeCompositeDuel';

const ROOT = join(__dirname, '../../..');
const ANALYSIS_PAGE = join(ROOT, 'src/app/analysis/page.tsx');

// wave-432: 팩터 수렴 픽 유효 팩터 수 표시 — cycle 1786.
// compositeDuelValidCount 필드 추가 + JSX "(N팩터)" 표시.
// validCount = 양 팀 데이터 있는 팩터 수 (homeWins+awayWins+ties ≤ validCount ≤ 10).

describe('wave-432 — compositeDuelValidCount 필드 정합성', () => {
  const pageContent = readFileSync(ANALYSIS_PAGE, 'utf8');

  it('analysis/page.tsx: compositeDuelValidCount 필드 정의', () => {
    expect(pageContent).toContain('compositeDuelValidCount');
  });

  it('analysis/page.tsx: wave-432 유효 팩터 수 표시 JSX 포함', () => {
    expect(pageContent).toContain('compositeDuelValidCount}팩터');
  });

  it('analysis/page.tsx: wave-432 헤더 주석 포함', () => {
    expect(pageContent).toContain('wave-432');
  });
});

describe('wave-432 — computeCompositeDuel validCount 검증', () => {
  it('모든 팩터 데이터 있으면 validCount=10', () => {
    const result = computeCompositeDuel({
      homeCode: 'KT',
      homeLineupWoba: 0.340,
      awayLineupWoba: 0.310,
      homeSfr: 5.0,
      awaySfr: 2.0,
      homeBullpenFip: 3.80,
      awayBullpenFip: 4.50,
      homeSPFip: 3.50,
      awaySPFip: 4.20,
      homeSPXfip: 3.60,
      awaySPXfip: 4.10,
      homeWar: 25.0,
      awayWar: 15.0,
      homeElo: 1580,
      awayElo: 1420,
      homeRecentForm: 0.70,
      awayRecentForm: 0.40,
      h2hHomeWins: 8,
      h2hAwayWins: 2,
    });
    expect(result.validCount).toBe(10);
  });

  it('SP 데이터 없으면 validCount=8 (sp_fip + sp_xfip 제외)', () => {
    const result = computeCompositeDuel({
      homeCode: 'KT',
      homeLineupWoba: 0.340,
      awayLineupWoba: 0.310,
      homeSfr: 5.0,
      awaySfr: 2.0,
      homeBullpenFip: 3.80,
      awayBullpenFip: 4.50,
      // SP 데이터 없음 (null)
      homeWar: 25.0,
      awayWar: 15.0,
      homeElo: 1580,
      awayElo: 1420,
      homeRecentForm: 0.70,
      awayRecentForm: 0.40,
      h2hHomeWins: 8,
      h2hAwayWins: 2,
    });
    expect(result.validCount).toBe(8);
  });

  it('validCount >= homeWins + awayWins 항상', () => {
    const result = computeCompositeDuel({
      homeCode: 'LG',
      homeLineupWoba: 0.320,
      awayLineupWoba: 0.318,
      homeSfr: 3.0,
      awaySfr: 2.9,
      homeBullpenFip: 4.0,
      awayBullpenFip: 4.1,
      homeSPFip: 3.9,
      awaySPFip: 4.0,
      homeSPXfip: 4.0,
      awaySPXfip: 4.05,
      homeWar: 20.0,
      awayWar: 19.5,
      homeElo: 1510,
      awayElo: 1490,
      homeRecentForm: 0.52,
      awayRecentForm: 0.48,
      h2hHomeWins: 5,
      h2hAwayWins: 5,
    });
    expect(result.validCount).toBeGreaterThanOrEqual(result.homeWins + result.awayWins);
  });

  it('validCount ≤ 10 항상 (팩터 최대 10개)', () => {
    const result = computeCompositeDuel({
      homeCode: 'SS',
      homeLineupWoba: 0.350,
      awayLineupWoba: 0.300,
      homeSfr: 6.0,
      awaySfr: 1.0,
      homeBullpenFip: 3.50,
      awayBullpenFip: 5.00,
      homeSPFip: 3.20,
      awaySPFip: 4.80,
      homeSPXfip: 3.30,
      awaySPXfip: 4.70,
      homeWar: 30.0,
      awayWar: 10.0,
      homeElo: 1620,
      awayElo: 1380,
      homeRecentForm: 0.80,
      awayRecentForm: 0.30,
      h2hHomeWins: 9,
      h2hAwayWins: 1,
    });
    expect(result.validCount).toBeLessThanOrEqual(10);
  });
});
