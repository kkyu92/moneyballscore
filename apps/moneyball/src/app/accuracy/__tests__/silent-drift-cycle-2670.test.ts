import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2670 review-code(heavy): buildScoringRuleDayHeatmap / buildScoringRuleWeekHeatmap /
// buildBrierTrend 가 CURRENT_MODEL_FILTER(scoring_rule='v1.8'만) 로 걸러진 `rows` 를
// 받아 v1.5/v1.6/v1.7-revert/v1.8-credit-fail cohort 가 영구히 n=0 — cohort 비교 기능이
// 구조적으로 죽어있었음(BrierTrendChart 의 SR_COLOR_MAP, ScoringRuleDayHeatmap 의
// SCORING_RULE_HEATMAP_ROWS 는 다중 era 를 전제로 설계됨). buildVersionHistory 가 이미
// 겪은 동일 패턴(line 277 주석)을 세 함수가 반복 — unfiltered `versionHistoryRows` 로 교체.

const pageSrc = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 2670 — scoring_rule cohort 비교 함수가 unfiltered versionHistoryRows 사용', () => {
  it('buildScoringRuleDayHeatmap 은 versionHistoryRows 사용 (v1.8 필터 rows 아님)', () => {
    expect(pageSrc).toContain('buildScoringRuleDayHeatmap(versionHistoryRows)');
  });

  it('buildScoringRuleWeekHeatmap 은 versionHistoryRows 사용', () => {
    expect(pageSrc).toContain('buildScoringRuleWeekHeatmap(versionHistoryRows)');
  });

  it('buildBrierTrend 은 versionHistoryRows 사용', () => {
    expect(pageSrc).toContain('buildBrierTrend(versionHistoryRows)');
  });
});
