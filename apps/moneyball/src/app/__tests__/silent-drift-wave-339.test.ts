import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LINEUP_WOBA_STRONG_TAG, LINEUP_WOBA_WEAK_TAG } from '@moneyball/shared';

const ROOT = join(__dirname, '../../..');
// cycle 1984 review-code(heavy): analysis/page.tsx 데이터 레이어 분리 리팩터로
// DB fetch/타입 정의는 analysis/analysis-data.ts 로, JSX 렌더/주석은 page.tsx 에 남음 — 둘 다 검사.
const ANALYSIS_PAGE_SRC =
  readFileSync(join(ROOT, 'src/app/analysis/page.tsx'), 'utf8') +
  readFileSync(join(ROOT, 'src/app/analysis/analysis-data.ts'), 'utf8');

describe('silent drift wave-339 — 타선 wOBA 배지 single source (cycle 1674)', () => {
  it('LINEUP_WOBA_STRONG_TAG = 0.34 (KBO 상위 타선 임계)', () => {
    expect(LINEUP_WOBA_STRONG_TAG).toBe(0.34);
  });

  it('LINEUP_WOBA_WEAK_TAG = 0.30 (KBO 하위 타선 임계)', () => {
    expect(LINEUP_WOBA_WEAK_TAG).toBe(0.30);
  });

  it('analysis: imports LINEUP_WOBA_STRONG_TAG + LINEUP_WOBA_WEAK_TAG from shared', () => {
    expect(ANALYSIS_PAGE_SRC).toContain('LINEUP_WOBA_STRONG_TAG');
    expect(ANALYSIS_PAGE_SRC).toContain('LINEUP_WOBA_WEAK_TAG');
  });

  it('analysis: no hardcoded wOBA thresholds (0.34 or 0.30 literal)', () => {
    expect(ANALYSIS_PAGE_SRC).not.toMatch(/awayLineupWoba [><=]+\s*0\.34/);
    expect(ANALYSIS_PAGE_SRC).not.toMatch(/homeLineupWoba [><=]+\s*0\.34/);
    expect(ANALYSIS_PAGE_SRC).not.toMatch(/awayLineupWoba [><=]+\s*0\.30/);
    expect(ANALYSIS_PAGE_SRC).not.toMatch(/homeLineupWoba [><=]+\s*0\.30/);
  });

  it('analysis: selects home_lineup_woba + away_lineup_woba from DB', () => {
    expect(ANALYSIS_PAGE_SRC).toContain('home_lineup_woba');
    expect(ANALYSIS_PAGE_SRC).toContain('away_lineup_woba');
  });

  it('analysis: TodayGameCard has homeLineupWoba + awayLineupWoba fields', () => {
    expect(ANALYSIS_PAGE_SRC).toContain('homeLineupWoba');
    expect(ANALYSIS_PAGE_SRC).toContain('awayLineupWoba');
  });

  it('analysis: wOBA badge renders wave-339 comment', () => {
    expect(ANALYSIS_PAGE_SRC).toContain('wave-339');
  });
});
