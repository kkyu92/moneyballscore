import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 3244 review-code(heavy): cycle 2670 이 buildScoringRuleDayHeatmap/buildScoringRuleWeekHeatmap/
// buildBrierTrend 의 데이터 소스는 unfiltered versionHistoryRows 로 교체했지만, 코호트 히트맵 섹션의
// render 게이트(`scoringRuleDayHeatmap.length > 0 && rows.length >= 10`)는 교체 안 됨 —
// scoringRuleDayHeatmap 은 SCORING_RULE_HEATMAP_ROWS(6) x 7요일 = 42개 cell 을 항상 미리 채워 반환하므로
// `.length > 0` 은 데이터 유무와 무관하게 항상 true(dead check), 실질 게이트는 CURRENT_MODEL_FILTER
// (scoring_rule='v1.8') 로 걸러진 `rows.length >= 10` 뿐 — era 전환 시 versionHistoryRows 는 수백건이어도
// rows 가 새 era 초반 소표본이면 코호트 히트맵이 조기에 숨겨짐. 실제 cell 존재 여부(`c.n > 0`) +
// unfiltered versionHistoryRows 길이로 교체.

const pageSrc = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 3244 — scoring_rule cohort 히트맵 render 게이트가 rows(필터됨) 아닌 versionHistoryRows(unfiltered) 사용', () => {
  it('히트맵 섹션 게이트는 cell 존재 여부(c.n > 0) 체크 사용, length 무조건-true 체크 아님', () => {
    expect(pageSrc).toContain('scoringRuleDayHeatmap.some((c) => c.n > 0)');
    expect(pageSrc).not.toContain('scoringRuleDayHeatmap.length > 0 && rows.length');
  });

  it('히트맵 섹션 게이트의 표본 수 조건은 versionHistoryRows 기준 (CURRENT_MODEL_FILTER 로 걸러진 rows 아님)', () => {
    expect(pageSrc).toContain('versionHistoryRows.length >= 10');
  });
});
