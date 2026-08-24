import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MIN_TEAM_PREDICTIONS } from '@moneyball/shared';

// cycle 2528 review-code(heavy): accuracy/page.tsx 의 winnerProbBuckets/cohortWeekHeatmap
// 섹션 렌더 게이트가 MIN_TEAM_PREDICTIONS 미사용, 하드코딩 `n >= 3` 중복 (wave-2463 이
// 팀별 성과 섹션은 swap했지만 이 두 섹션은 놓침). MlbAccuracyDashboard.tsx(MLB parity)의
// cohortWeekHeatmap 게이트도 동일 하드코딩 — wave-113/2300/2463 과 동일 family.

const accuracySrc = readFileSync(join(__dirname, '../page.tsx'), 'utf8');
const mlbDashboardSrc = readFileSync(
  join(__dirname, '../../../components/accuracy/MlbAccuracyDashboard.tsx'),
  'utf8',
);

describe('silent drift cycle 2528 — 섹션 렌더 게이트 MIN_TEAM_PREDICTIONS 상수 swap', () => {
  it('accuracy/page.tsx: winnerProbBuckets 게이트 하드코딩 `n >= 3` 없음', () => {
    expect(accuracySrc).not.toContain('winnerProbBuckets.some((b) => b.n >= 3)');
    expect(accuracySrc).toContain('winnerProbBuckets.some((b) => b.n >= MIN_TEAM_PREDICTIONS)');
  });

  it('accuracy/page.tsx: cohortWeekHeatmap 게이트 하드코딩 `n >= 3` 없음', () => {
    expect(accuracySrc).not.toContain('cohortWeekHeatmap.some((c) => c.n >= 3)');
    expect(accuracySrc).toContain('cohortWeekHeatmap.some((c) => c.n >= MIN_TEAM_PREDICTIONS)');
  });

  it('MlbAccuracyDashboard.tsx: cohortWeekHeatmap 게이트 하드코딩 `n >= 3` 없음 + MIN_TEAM_PREDICTIONS import', () => {
    expect(mlbDashboardSrc).not.toContain('cohortWeekHeatmap.some((c) => c.n >= 3)');
    expect(mlbDashboardSrc).toContain('cohortWeekHeatmap.some((c) => c.n >= MIN_TEAM_PREDICTIONS)');
    expect(mlbDashboardSrc).toContain('MIN_TEAM_PREDICTIONS');
  });

  it('MIN_TEAM_PREDICTIONS 값은 3 (기존 상수 유지)', () => {
    expect(MIN_TEAM_PREDICTIONS).toBe(3);
  });
});
