import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');

describe('silent drift wave 2214 — analysis 페이지 CE-fallback 누락 필터 + WAR=0 가드 불일치 (cycle 2214)', () => {
  it('analysis-data.ts: CURRENT_MODEL_FILTER 와 PRODUCTION_COHORT_RULES 중복 AND 결합 제거 (CE-fallback silent exclusion)', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/analysis/analysis-data.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/CURRENT_MODEL_FILTER/);
  });

  it('analysis-data.ts: getPeriodStats/getBestPickOfWeek/getUpsetPickOfMonth 모두 PRODUCTION_COHORT_RULES 단독 사용', () => {
    const src = readFileSync(
      join(ROOT, 'src/app/analysis/analysis-data.ts'),
      'utf8',
    );
    const inClauses = src.match(/\.in\(['"]scoring_rule['"], PRODUCTION_COHORT_RULES\)/g) ?? [];
    expect(inClauses.length).toBeGreaterThanOrEqual(3);
  });

  it('page.tsx: wave-367 WAR 직접 대결 배지도 wave-508/521 과 동일하게 WAR=0 data gap 가드 적용', () => {
    const src = readFileSync(join(ROOT, 'src/app/analysis/page.tsx'), 'utf8');
    const guardedWarChecks = src.match(
      /g\.homeWar != null && g\.awayWar != null && g\.homeWar > 0 && g\.awayWar > 0/g,
    ) ?? [];
    expect(guardedWarChecks.length).toBe(3);
  });
});
