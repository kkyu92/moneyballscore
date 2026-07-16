import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SP_AVG_FIP_DUEL, LINEUP_AVG_WOBA_HITTER } from '@moneyball/shared';
import { buildGameOverview } from '@/lib/analysis/factor-explanations';

const ROOT = join(__dirname, '../../..');
const FACTOR_EXPLANATIONS = join(ROOT, 'src/lib/analysis/factor-explanations.ts');

describe('silent drift wave-348 — buildGameOverview 경기 유형 태그 단일 소스 (cycle 1685)', () => {
  it('factor-explanations.ts: SP_AVG_FIP_DUEL import 단일 소스 (SP_FIP_STRONG 교체)', () => {
    const src = readFileSync(FACTOR_EXPLANATIONS, 'utf8');
    expect(src).toContain('SP_AVG_FIP_DUEL');
    expect(src).not.toContain('SP_FIP_STRONG');
  });

  it('factor-explanations.ts: LINEUP_AVG_WOBA_HITTER import 단일 소스 (LINEUP_WOBA_STRONG_TAG 교체)', () => {
    const src = readFileSync(FACTOR_EXPLANATIONS, 'utf8');
    expect(src).toContain('LINEUP_AVG_WOBA_HITTER');
    expect(src).not.toContain('LINEUP_WOBA_STRONG_TAG');
  });

  it('투수전 경계값: avgSpFip=3.7 < SP_AVG_FIP_DUEL(4.0) → 투수전 예상 태그', () => {
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeSPFip: 3.5,
      awaySPFip: 3.9,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags).toContain('투수전 예상');
  });

  it('투수전 경계값: avgSpFip=4.1 >= SP_AVG_FIP_DUEL(4.0) → 투수전 예상 없음', () => {
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeSPFip: 4.0,
      awaySPFip: 4.2,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags).not.toContain('투수전 예상');
  });

  it('타격전 경계값: avgWoba=0.33 > LINEUP_AVG_WOBA_HITTER(0.32) → 타격전 예상 태그', () => {
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeWoba: 0.325,
      awayWoba: 0.335,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags).toContain('타격전 예상');
  });

  it('타격전 경계값: avgWoba=0.31 <= LINEUP_AVG_WOBA_HITTER(0.32) → 타격전 예상 없음', () => {
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeWoba: 0.30,
      awayWoba: 0.32,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags).not.toContain('타격전 예상');
  });

  it('analysis/page.tsx 와 buildGameOverview 동일 임계값 — SP_AVG_FIP_DUEL', () => {
    expect(SP_AVG_FIP_DUEL).toBe(4.0);
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeSPFip: SP_AVG_FIP_DUEL - 0.5,
      awaySPFip: SP_AVG_FIP_DUEL - 0.5,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags).toContain('투수전 예상');
  });

  it('analysis/page.tsx 와 buildGameOverview 동일 임계값 — LINEUP_AVG_WOBA_HITTER', () => {
    expect(LINEUP_AVG_WOBA_HITTER).toBe(0.32);
    const result = buildGameOverview({
      homeWinProb: 0.5,
      homeWoba: LINEUP_AVG_WOBA_HITTER + 0.01,
      awayWoba: LINEUP_AVG_WOBA_HITTER + 0.01,
      homeTeamName: 'KIA',
      awayTeamName: 'NC',
    });
    expect(result.tags).toContain('타격전 예상');
  });
});
