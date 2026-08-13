// plan #24 Phase 3c (cycle 2070): /mlb/matchup/[teamA]/[teamB] 두 팀 맞대결 한정 수렴 픽 성적 —
// wave-608(KBO) 의 MLB 대응. computeMlbCompositeDuel + MLB_PRODUCTION_COHORT_RULES 신규 필요했던
// blocker(cycle 2063 확인: KBO PRODUCTION_COHORT_RULES 필터를 MLB predictions 에 그대로 쓰면 항상
// 빈 배열, MLB 는 scoring_rule='mlb_v0.1' 단일값)를 MLB 전용 cohort 상수로 해소.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { computeConvergenceTeamStats } from '@/lib/analysis/convergenceRecord';
import { MLB_FACTOR_PICK_STRONG, MLB_FACTOR_PICK_COMPLETE, MLB_COMPOSITE_DUEL_MIN_VALID } from '@moneyball/shared';

const koPageSrc = readFileSync(
  join(__dirname, '../mlb/matchup/[teamA]/[teamB]/page.tsx'),
  'utf-8',
);
const enPageSrc = readFileSync(
  join(__dirname, '../en/mlb/matchup/[teamA]/[teamB]/page.tsx'),
  'utf-8',
);
const recordComponentSrc = readFileSync(
  join(__dirname, '../../components/matchup/MlbMatchupConvergencePickRecord.tsx'),
  'utf-8',
);

describe('plan #24 Phase 3c: MLB 매치업 페이지 두 팀 한정 수렴 픽 성적', () => {
  it('getMlbConvergencePickHeadToHeadRecord 강수렴/완전수렴 병렬 조회됨 (KO+EN 양쪽)', () => {
    for (const src of [koPageSrc, enPageSrc]) {
      expect(src).toContain(
        'getMlbConvergencePickHeadToHeadRecord(pair.codeA, pair.codeB, MLB_FACTOR_PICK_STRONG)',
      );
      expect(src).toContain(
        'getMlbConvergencePickHeadToHeadRecord(pair.codeA, pair.codeB, MLB_FACTOR_PICK_COMPLETE)',
      );
    }
  });

  it('MLB_FACTOR_PICK_STRONG/COMPLETE 는 KBO FACTOR_PICK_STRONG(8)/COMPLETE(10) 을 그대로 쓰지 않음 — 6팩터 스케일', () => {
    // netScore 최대치(6) 가 KBO 임계(8/10) 를 넘지 못해 항상 빈 배열만 반환하는 dead 게이트 방지.
    expect(MLB_FACTOR_PICK_STRONG).toBeLessThanOrEqual(6);
    expect(MLB_FACTOR_PICK_COMPLETE).toBeLessThanOrEqual(6);
    expect(MLB_COMPOSITE_DUEL_MIN_VALID).toBeLessThanOrEqual(6);
  });

  it('fetch 실패 시 captureFallback 으로 빈 배열 fallback', () => {
    for (const src of [koPageSrc, enPageSrc]) {
      expect(src).toContain('getMlbConvergencePickHeadToHeadRecord(strong)');
      expect(src).toContain('getMlbConvergencePickHeadToHeadRecord(complete)');
    }
  });

  it('MlbMatchupConvergencePickRecord 를 시즌별 상대전적 섹션 앞에 렌더함 (KBO 순서 정합)', () => {
    for (const src of [koPageSrc, enPageSrc]) {
      const recordIdx = src.indexOf('<MlbMatchupConvergencePickRecord');
      const seasonH2hIdx = src.indexOf('<MlbMatchupSeasonHeadToHead');
      expect(recordIdx).toBeGreaterThan(-1);
      expect(seasonH2hIdx).toBeGreaterThan(-1);
      expect(recordIdx).toBeLessThan(seasonH2hIdx);
    }
  });

  it('양 팀 모두 강수렴/완전수렴 표본 없으면 렌더 skip', () => {
    expect(recordComponentSrc).toContain('if (rows.length === 0) return null;');
  });

  it('KO+EN locale 문자열 분기 보유 (MlbMatchupRecentForm/SeasonHeadToHead 동일 패턴)', () => {
    expect(recordComponentSrc).toContain('locale = "ko"');
    expect(recordComponentSrc).toContain('en:');
  });

  it('computeConvergenceTeamStats 는 generic 이라 MlbTeamCode 로도 동일하게 동작함', () => {
    const results = [
      { favoredTeam: 'NYM' as const, won: true },
      { favoredTeam: 'NYM' as const, won: true },
      { favoredTeam: 'NYM' as const, won: false },
      { favoredTeam: 'PHI' as const, won: true },
    ];
    const stats = computeConvergenceTeamStats(results, 3);
    expect(stats).toEqual([{ teamCode: 'NYM', wins: 2, losses: 1 }]);
  });
});
