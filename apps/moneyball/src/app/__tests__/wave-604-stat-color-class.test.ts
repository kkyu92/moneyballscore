import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import {
  statColorClassHigherBetter,
  statColorClassHigherBetterStrict,
  statColorClassLowerBetter,
} from '@/lib/analysis/convergenceRecord';

// wave-604: analysis/page.tsx 내 24+회 반복되던 "팩터 수치 → brand/orange 색상" inline
// ternary를 3개 순수 함수로 추출 (wave-574가 승률 pct 버전만 추출하고 원본 팩터 수치
// 버전은 누락됐던 것 정리). 각 함수는 원본 comparator(>=/<=  vs  </>)를 그대로 보존.

describe('wave-604: statColorClassHigherBetter (>=/<=, 클수록 강세)', () => {
  it('strong 이상 → brand', () => {
    expect(statColorClassHigherBetter(10, 10, 5)).toBe('text-brand-500 dark:text-brand-400');
    expect(statColorClassHigherBetter(20, 10, 5)).toBe('text-brand-500 dark:text-brand-400');
  });

  it('weak 이하 → orange', () => {
    expect(statColorClassHigherBetter(5, 10, 5)).toBe('text-orange-500 dark:text-orange-400');
    expect(statColorClassHigherBetter(0, 10, 5)).toBe('text-orange-500 dark:text-orange-400');
  });

  it('strong/weak 사이 → fallback (기본값 빈 문자열)', () => {
    expect(statColorClassHigherBetter(7, 10, 5)).toBe('');
  });

  it('fallback 커스텀 클래스 전달', () => {
    expect(statColorClassHigherBetter(7, 10, 5, 'text-gray-400 dark:text-gray-500')).toBe(
      'text-gray-400 dark:text-gray-500',
    );
  });
});

describe('wave-604: statColorClassHigherBetterStrict (>/< strict, Elo neutral-band)', () => {
  it('strong 초과 → brand (경계값 자체는 미포함)', () => {
    expect(statColorClassHigherBetterStrict(1551, 1550, 1450)).toBe('text-brand-500 dark:text-brand-400');
    expect(statColorClassHigherBetterStrict(1550, 1550, 1450)).toBe('');
  });

  it('weak 미만 → orange (경계값 자체는 미포함)', () => {
    expect(statColorClassHigherBetterStrict(1449, 1550, 1450)).toBe('text-orange-500 dark:text-orange-400');
    expect(statColorClassHigherBetterStrict(1450, 1550, 1450)).toBe('');
  });
});

describe('wave-604: statColorClassLowerBetter (</>,  작을수록 강세 — FIP류)', () => {
  it('strong 미만 → brand', () => {
    expect(statColorClassLowerBetter(3.0, 3.5, 4.5)).toBe('text-brand-500 dark:text-brand-400');
  });

  it('weak 초과 → orange', () => {
    expect(statColorClassLowerBetter(5.0, 3.5, 4.5)).toBe('text-orange-500 dark:text-orange-400');
  });

  it('strong/weak 사이 → fallback', () => {
    expect(statColorClassLowerBetter(4.0, 3.5, 4.5)).toBe('');
    expect(statColorClassLowerBetter(4.0, 3.5, 4.5, 'text-gray-400 dark:text-gray-500')).toBe(
      'text-gray-400 dark:text-gray-500',
    );
  });
});

describe('wave-604: analysis/page.tsx 실제 호출부 마이그레이션 확인', () => {
  const pageSrc = readFileSync(
    join(__dirname, '../analysis/page.tsx'),
    'utf-8',
  );

  it('SP FIP / xFIP / 불펜 FIP 대결 표시가 statColorClassLowerBetter 사용', () => {
    expect(pageSrc).toContain('statColorClassLowerBetter(pick.awaySPFip, SP_FIP_STRONG, SP_FIP_WEAK)');
    expect(pageSrc).toContain('statColorClassLowerBetter(pick.awaySPXfip, SP_FIP_STRONG, SP_FIP_WEAK)');
    expect(pageSrc).toContain('statColorClassLowerBetter(pick.awayBullpenFip, BULLPEN_FIP_STRONG, BULLPEN_FIP_WEAK)');
  });

  it('타선 wOBA / 최근폼 / WAR / SFR 대결 표시가 statColorClassHigherBetter 사용', () => {
    expect(pageSrc).toContain('statColorClassHigherBetter(pick.awayLineupWoba, LINEUP_WOBA_STRONG_TAG, LINEUP_WOBA_WEAK_TAG)');
    expect(pageSrc).toContain('statColorClassHigherBetter(pick.awayRecentForm, TEAM_STRENGTH_FORM_STRONG, TEAM_STRENGTH_FORM_WEAK)');
    expect(pageSrc).toContain('statColorClassHigherBetter(pick.awayWar, WAR_STRONG, WAR_WEAK)');
    expect(pageSrc).toContain('statColorClassHigherBetter(pick.awaySfr, SFR_STRONG, SFR_WEAK)');
  });

  it('Elo 대결 표시가 statColorClassHigherBetterStrict 사용', () => {
    expect(pageSrc).toContain(
      'statColorClassHigherBetterStrict(pick.awayElo, ELO_NEUTRAL + ELO_DISPLAY_NEUTRAL_BAND, ELO_NEUTRAL - ELO_DISPLAY_NEUTRAL_BAND)',
    );
  });

  it('오늘 경기 섹션(g.*) 배지도 동일 헬퍼로 마이그레이션', () => {
    expect(pageSrc).toContain("statColorClassLowerBetter(g.awaySPFip, SP_FIP_STRONG, SP_FIP_WEAK, 'text-gray-400 dark:text-gray-500')");
    expect(pageSrc).toContain("statColorClassHigherBetter(g.awayWar, WAR_STRONG, WAR_WEAK, 'text-gray-400 dark:text-gray-500')");
    expect(pageSrc).toContain("statColorClassHigherBetter(g.awaySfr, SFR_STRONG, SFR_WEAK, 'text-gray-400 dark:text-gray-500')");
    expect(pageSrc).toContain("statColorClassLowerBetter(g.awayBullpenFip, BULLPEN_FIP_STRONG, BULLPEN_FIP_WEAK, 'text-gray-400 dark:text-gray-500')");
  });
});
