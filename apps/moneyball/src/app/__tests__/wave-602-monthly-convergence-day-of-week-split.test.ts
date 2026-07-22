// wave-602: /reviews/monthly/[month] 수렴 픽 요일별 분리 성적 배지 박제
// reviews 허브 wave-599 (시즌 전체 요일별 split) 자연 확장 — 월간 범위(startDate~endDate) 한정.
// getConvergencePickDayOfWeekSplit 에 startDate/endDate optional param 추가 (wave-600 홈/어웨이 동일 패턴).
// 주간 상세(weekly)는 대상 X — 한 주엔 요일당 경기가 최대 1~2개뿐이라 CONVERGENCE_DAY_OF_WEEK_MIN_PICKS(=3) 문턱을
// 구조적으로 못 넘어 섹션이 항상 숨겨짐 (표본이 "가끔" 작은 홈/어웨이와 달리 구조적으로 항상 부족).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getConvergencePickDayOfWeekSplit, computeConvergenceDayOfWeekSplit } from '@/lib/analysis/convergenceRecord';

const monthlySrc = readFileSync(
  join(__dirname, '../reviews/monthly/[month]/page.tsx'),
  'utf-8',
);

const weeklySrc = readFileSync(
  join(__dirname, '../reviews/weekly/[week]/page.tsx'),
  'utf-8',
);
// cycle 1993: 요일별 배지 렌더링(라벨/가드)은 2-way 중복(hub+monthly) 이라
// ConvergenceDayOfWeekBadges 공용 컴포넌트로 추출됨 — 렌더링 detail 은 컴포넌트 소스에서 검증.
const badgesComponentSrc = readFileSync(
  join(__dirname, '../../components/reviews/ConvergenceDayOfWeekBadges.tsx'),
  'utf-8',
);

describe('wave-602: getConvergencePickDayOfWeekSplit startDate/endDate 하위호환', () => {
  it('optional param 미지정 시 기존 시그니처와 동일하게 함수 참조 가능 (arity 변경 X 강제 X)', () => {
    expect(typeof getConvergencePickDayOfWeekSplit).toBe('function');
  });

  it('순수 함수(computeConvergenceDayOfWeekSplit)는 범위 스코프와 무관 — 입력 results 배열만으로 결정', () => {
    const scoped = [
      { gameDate: '2026-07-06', won: true },  // 월
      { gameDate: '2026-07-13', won: true },  // 월
      { gameDate: '2026-07-20', won: false }, // 월
      { gameDate: '2026-07-07', won: true },  // 화
      { gameDate: '2026-07-14', won: true },  // 화
    ];
    expect(computeConvergenceDayOfWeekSplit(scoped)).toEqual([
      { dayIndex: 1, wins: 2, losses: 1 },
    ]);
  });
});

describe('wave-602: /reviews/monthly/[month] 수렴 픽 요일별 분리 성적 배지', () => {
  it('getConvergencePickDayOfWeekSplit 임포트됨', () => {
    expect(monthlySrc).toContain('getConvergencePickDayOfWeekSplit');
  });

  it('강수렴/완전수렴 요일별 분리 성적 range.startDate~endDate 로 Promise.all 병렬 조회됨', () => {
    expect(monthlySrc).toContain('strongDayOfWeekSplit');
    expect(monthlySrc).toContain('completeDayOfWeekSplit');
    expect(monthlySrc).toContain('getConvergencePickDayOfWeekSplit(FACTOR_PICK_STRONG, range.startDate, range.endDate)');
    expect(monthlySrc).toContain('getConvergencePickDayOfWeekSplit(FACTOR_PICK_COMPLETE, range.startDate, range.endDate)');
  });

  it('ConvergenceDayOfWeekBadges 컴포넌트에 titleId + split 전달함', () => {
    expect(monthlySrc).toContain('ConvergenceDayOfWeekBadges');
    expect(monthlySrc).toContain('monthly-day-of-week-title');
  });

  it('요일별 수렴 픽 성적 섹션 존재함', () => {
    expect(badgesComponentSrc).toContain('요일별 수렴 픽 성적');
  });

  it('강수렴 배지 라벨 존재함', () => {
    expect(badgesComponentSrc).toContain('🏅 강수렴:');
  });

  it('완전수렴 배지 라벨 + amber 테마 존재함', () => {
    expect(badgesComponentSrc).toContain('★ 완전수렴:');
  });

  it('WEEKDAY_LABELS_KO 로 요일 라벨 표시함', () => {
    expect(badgesComponentSrc).toContain('WEEKDAY_LABELS_KO[stat.dayIndex]');
  });

  it('빈 배열 시 섹션 숨김 가드 존재함', () => {
    expect(badgesComponentSrc).toContain('strongSplit.length === 0 && completeSplit.length === 0');
  });
});

describe('wave-602: /reviews/weekly/[week] 는 요일별 split 대상 제외 (구조적 표본 부족)', () => {
  it('weekly 페이지엔 day-of-week split 미도입됨 (한 주엔 요일당 최대 1~2경기뿐 — minPicks=3 구조적으로 항상 미달)', () => {
    expect(weeklySrc).not.toContain('getConvergencePickDayOfWeekSplit');
  });
});
