import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { MLB_ANALYSIS_UPCOMING_LIMIT } from '@moneyball/shared';

// plan #28 Phase 2 (cycle 2316, explore-idea heavy) — "이번 주 남은 경기" 섹션만 착수.
// TeamStrengthGrid MLB 버전은 당시 스코프 밖(블로커: MLB recent_form 데이터 소스
// 자체 부재 — predictions.home_recent_form/away_recent_form 전량 null, mlb-pipeline.ts
// 가 저장 안 함). cycle 2323(explore-idea heavy) 가 대체 데이터 소스(mlb_schedule 실제
// 완료 경기 기준 win rate, buildMlbTeamStrengthSnapshot.ts)로 후속 구현 완료 —
// MlbTeamStrengthGrid 로 배선(plan28-phase-team-strength 테스트 참조).

const page = readFileSync(
  path.resolve(__dirname, '../mlb/analysis/page.tsx'),
  'utf8',
);
const dataFile = readFileSync(
  path.resolve(__dirname, '../mlb/analysis/analysis-data.ts'),
  'utf8',
);

describe('plan #28 Phase 2 — /mlb/analysis 이번 주 남은 경기 섹션', () => {
  it('MLB_ANALYSIS_UPCOMING_LIMIT = 90 (KBO ANALYSIS_UPCOMING_LIMIT=30 재사용 X — MLB 하루 최대 경기수 다름)', () => {
    expect(MLB_ANALYSIS_UPCOMING_LIMIT).toBe(90);
  });

  it('getMlbThisWeekRemainingGames 가 predictions 를 mlb_game_date 로 직접 조회 (games!inner 조인 X)', () => {
    expect(dataFile).toContain("gte('mlb_game_date', tomorrow)");
    expect(dataFile).not.toContain('games!inner');
  });

  it('mlb_schedule 2-step 조인으로 팀 코드 확보 (cycle 2114/1168 silent drift family 패턴 재사용)', () => {
    expect(dataFile).toContain("from('mlb_schedule')");
    expect(dataFile).toContain('normalizeMlbTeamCode');
  });

  it('computeMlbCompositeDuel 재사용 (신규 duel 로직 재작성 X)', () => {
    expect(dataFile).toContain('computeMlbCompositeDuel({');
  });

  it('getCurrentWeek() 리그 무관 재사용 (KBO computeWeekRange.ts 그대로)', () => {
    expect(dataFile).toContain("from '@/lib/reviews/computeWeekRange'");
  });

  it('page.tsx 에 이번 주 남은 경기 섹션 배선 + 날짜별 그룹', () => {
    expect(page).toContain('이번 주 남은 경기');
    expect(page).toContain('groupMlbGamesByDate');
    expect(page).toContain('weekRemainingByDate');
  });

});
