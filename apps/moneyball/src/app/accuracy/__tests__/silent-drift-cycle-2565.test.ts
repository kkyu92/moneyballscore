import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MIN_TEAM_PREDICTIONS } from '@moneyball/shared';

// cycle 2565 review-code(heavy): MlbAccuracyDashboard.tsx 팀별 성과 테이블 게이트가
// import 된 MIN_TEAM_PREDICTIONS 대신 로컬 shadow 상수 `TEAM_TABLE_MIN_N = 3` 를
// 별도 선언해 사용 — cycle 2528 fix 가 cohortWeekHeatmap 섹션만 swap 하고 팀 테이블
// 섹션(라인 388/391)은 놓침. 값이 우연히 3=3 이라 지금은 동작 동일하지만, 공유 상수가
// 바뀌면 이 파일만 silent 하게 divergence — MIN_TEAM_PREDICTIONS family 재발.

const mlbDashboardSrc = readFileSync(
  join(__dirname, '../../../components/accuracy/MlbAccuracyDashboard.tsx'),
  'utf8',
);

describe('silent drift cycle 2565 — MlbAccuracyDashboard 팀 테이블 게이트 로컬 shadow 상수 제거', () => {
  it('로컬 TEAM_TABLE_MIN_N shadow 상수 선언 없음', () => {
    expect(mlbDashboardSrc).not.toContain('TEAM_TABLE_MIN_N');
  });

  it('팀 테이블 정확도 셀 게이트가 MIN_TEAM_PREDICTIONS 직접 사용', () => {
    expect(mlbDashboardSrc).toContain('t.verifiedN < MIN_TEAM_PREDICTIONS');
    expect(mlbDashboardSrc).toContain('t.verifiedN >= MIN_TEAM_PREDICTIONS');
  });

  it('MIN_TEAM_PREDICTIONS 값은 3 (기존 상수 유지)', () => {
    expect(MIN_TEAM_PREDICTIONS).toBe(3);
  });
});
