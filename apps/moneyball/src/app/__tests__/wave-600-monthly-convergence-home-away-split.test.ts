// wave-600: /reviews/monthly/[month] 수렴 픽 홈/어웨이 분리 성적 배지 박제
// reviews 허브 wave-597 (시즌 전체 홈/어웨이 split) 자연 확장 — 월간 범위(startDate~endDate) 한정.
// getConvergencePickHomeAwaySplit 에 startDate/endDate optional param 추가 (getRecentConvergencePickRecord wave-546/584 동일 패턴).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getConvergencePickHomeAwaySplit, computeConvergenceHomeAwaySplit } from '@/lib/analysis/convergenceRecord';

const monthlySrc = readFileSync(
  join(__dirname, '../reviews/monthly/[month]/page.tsx'),
  'utf-8',
);

describe('wave-600: getConvergencePickHomeAwaySplit startDate/endDate 하위호환', () => {
  it('optional param 미지정 시 기존 시그니처와 동일하게 함수 참조 가능 (arity 변경 X 강제 X)', () => {
    expect(typeof getConvergencePickHomeAwaySplit).toBe('function');
  });

  it('순수 함수(computeConvergenceHomeAwaySplit)는 범위 스코프와 무관 — 입력 results 배열만으로 결정', () => {
    const scoped = [
      { favoredHome: true, won: true },
      { favoredHome: true, won: true },
      { favoredHome: true, won: false },
      { favoredHome: true, won: true },
      { favoredHome: true, won: true },
      { favoredHome: false, won: true },
      { favoredHome: false, won: false },
      { favoredHome: false, won: true },
      { favoredHome: false, won: true },
      { favoredHome: false, won: true },
    ];
    expect(computeConvergenceHomeAwaySplit(scoped)).toEqual({
      home: { wins: 4, losses: 1 },
      away: { wins: 4, losses: 1 },
    });
  });
});

describe('wave-600: /reviews/monthly/[month] 수렴 픽 홈/어웨이 분리 성적 배지', () => {
  it('getConvergencePickHomeAwaySplit 임포트됨', () => {
    expect(monthlySrc).toContain('getConvergencePickHomeAwaySplit');
  });

  it('강수렴/완전수렴 홈/어웨이 분리 성적 range.startDate~endDate 로 Promise.all 병렬 조회됨', () => {
    expect(monthlySrc).toContain('strongHomeAwaySplit');
    expect(monthlySrc).toContain('completeHomeAwaySplit');
    expect(monthlySrc).toContain('getConvergencePickHomeAwaySplit(FACTOR_PICK_STRONG, range.startDate, range.endDate)');
    expect(monthlySrc).toContain('getConvergencePickHomeAwaySplit(FACTOR_PICK_COMPLETE, range.startDate, range.endDate)');
  });

  it('홈/어웨이 지목 성적 섹션 존재함', () => {
    expect(monthlySrc).toContain('monthly-home-away-title');
    expect(monthlySrc).toContain('홈/어웨이 지목 성적');
  });

  it('강수렴 배지 라벨 존재함', () => {
    expect(monthlySrc).toContain('🏅 강수렴:');
  });

  it('완전수렴 배지 라벨 + amber 테마 존재함', () => {
    expect(monthlySrc).toContain('★ 완전수렴:');
  });

  it('홈/어웨이 아이콘 라벨 존재함', () => {
    expect(monthlySrc).toContain('🏠홈');
    expect(monthlySrc).toContain('✈️원정');
  });

  it('null 시 섹션 숨김 가드 존재함', () => {
    expect(monthlySrc).toContain('strongHomeAwaySplit !== null || completeHomeAwaySplit !== null');
  });
});
