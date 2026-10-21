import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 3243 review-code(heavy): renderConvergenceTeamBadgeRow (팀별 수렴 적중 배지,
// 강수렴/완전수렴 양쪽 공유) 는 모든 다른 수렴 기록 배지(라인 493/1889/1901/1912/1969/2009/2020)와
// 달리 SMALL_SAMPLE_N(5) 가드가 없었다 — upstream computeConvergenceTeamStats 의
// CONVERGENCE_TEAM_STATS_MIN_PICKS(3)는 "표시 여부" 임계일 뿐 "소표본 경고" 임계가 아닌데,
// 3보다 크고 5 미만인 n=3~4 팀도 다른 배지와 달리 흐림 처리/소표본 라벨 없이 굵은 퍼센트로
// 표시되고 있었다. cycle 3239(f904b3dc)와 동일 silent drift family — 그 cycle은 reviews
// monthly/weekly twins에 가드를 전파했고, 본 cycle은 analysis/page.tsx 로컬 헬퍼에 전파.

const src = readFileSync(join(__dirname, '../page.tsx'), 'utf8');

describe('silent drift cycle 3243 — 팀별 수렴 배지 SMALL_SAMPLE_N 가드 누락 정정', () => {
  it('renderConvergenceTeamBadgeRow 가 total < SMALL_SAMPLE_N 을 판별한다', () => {
    expect(src).toContain('const isSmallSample = total < SMALL_SAMPLE_N;');
  });

  it('소표본 배지에 opacity-60 클래스가 적용된다', () => {
    expect(src).toMatch(/\$\{opts\.badgeBgClass\} \$\{isSmallSample \? 'opacity-60' : ''\}/);
  });

  it('소표본 배지 title 에 참고용(N경기 미만) 경고 문구가 포함된다', () => {
    expect(src).toContain('isSmallSample ? ` · 참고용(${SMALL_SAMPLE_N}경기 미만)` : \'\'');
  });
});
