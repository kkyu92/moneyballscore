// wave-594: /reviews/weekly/[week], /reviews/monthly/[month] 상세 페이지 수렴 픽 스트리크 카드 박제
// wave-592 (허브, 시즌 전체 streak) 자연 확장 — 주간/월간 범위(startDate~endDate) 한정 streak.
// getConvergencePickStreak / getConvergencePickBestStreak 에 startDate/endDate optional param 추가.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getConvergencePickStreak, getConvergencePickBestStreak, computeConvergenceStreak, computeConvergenceBestStreak } from '@/lib/analysis/convergenceRecord';

const weeklySrc = readFileSync(
  join(__dirname, '../reviews/weekly/[week]/page.tsx'),
  'utf-8',
);
const monthlySrc = readFileSync(
  join(__dirname, '../reviews/monthly/[month]/page.tsx'),
  'utf-8',
);

describe('wave-594: getConvergencePickStreak/getConvergencePickBestStreak startDate/endDate 하위호환', () => {
  it('optional param 미지정 시 기존 시그니처와 동일하게 함수 참조 가능 (arity 변경 X 강제 X)', () => {
    expect(typeof getConvergencePickStreak).toBe('function');
    expect(typeof getConvergencePickBestStreak).toBe('function');
  });

  it('순수 함수(computeConvergenceStreak/computeConvergenceBestStreak)는 범위 스코프와 무관 — 입력 results 배열만으로 결정', () => {
    // 주/월 범위로 좁혀진 results 를 넘겨도 동일 로직 재사용
    const scoped = [true, true, false];
    expect(computeConvergenceStreak(scoped)).toEqual({ type: 'win', length: 2 });
    expect(computeConvergenceBestStreak(scoped)).toEqual({ type: 'win', length: 2 });
  });
});

describe.each([
  ['weekly', () => weeklySrc, '이번 주'],
  ['monthly', () => monthlySrc, '이번 달'],
] as const)('wave-594: /reviews/%s/[id] 수렴 픽 스트리크 카드', (_label, getSrc, periodLabel) => {
  it('getConvergencePickStreak / getConvergencePickBestStreak range.startDate~endDate 로 조회됨', () => {
    const src = getSrc();
    expect(src).toContain('getConvergencePickStreak(FACTOR_PICK_STRONG, range.startDate, range.endDate)');
    expect(src).toContain('getConvergencePickBestStreak(FACTOR_PICK_STRONG, range.startDate, range.endDate)');
    expect(src).toContain('getConvergencePickStreak(FACTOR_PICK_COMPLETE, range.startDate, range.endDate)');
    expect(src).toContain('getConvergencePickBestStreak(FACTOR_PICK_COMPLETE, range.startDate, range.endDate)');
  });

  it('스트리크 섹션 존재함', () => {
    const src = getSrc();
    expect(src).toContain('수렴 픽 스트리크');
    expect(src).toContain("? '승' : '패'");
  });

  it('범위 내 최장 streak 컨텍스트 문구가 기간 스코프 라벨 사용 (시즌 X)', () => {
    const src = getSrc();
    expect(src).toContain(`${periodLabel} 최장`);
  });

  it('완전수렴 픽 카드 존재함 (★ 표시)', () => {
    const src = getSrc();
    expect(src).toContain('★ 완전수렴 픽');
  });

  it('win/loss 조건부 색상 (🔥 amber / ❄️ sky) 사용됨', () => {
    const src = getSrc();
    expect(src).toContain('🔥');
    expect(src).toContain('❄️');
  });
});
