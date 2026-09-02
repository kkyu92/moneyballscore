/**
 * Korean team-name wrap bug family — full-codebase sweep lock-in.
 *
 * 배경: shortTeamName(code) / .teamName / KBO_TEAMS[code].name 이 좁은 flex/grid
 * 컬럼 span 안에서 whitespace-nowrap (또는 truncate/break-keep) 없이 렌더될 때
 * 한글 팀명이 글자 중간에서 줄바꿈되는 버그가 12번 개별 재발 (최근: TeamMatchupCards.tsx,
 * commit ddd5db47). 이번엔 전체 앱 라우트(app/*)를 한 번에 스윕 — 페이지 단위 서버
 * 컴포넌트라 전체 렌더 테스트 대신, 실제 소스 문자열에 wrap-prevention 클래스가
 * 박제됐는지 정적 검증 (silent-drift-cycle-*.test.ts 와 동일 패턴).
 *
 * 컴포넌트 단위(AgentVoteCard/DebateTimeline/BigMatchDebateCard/JudgeVerdictPanel/
 * PredictionCard/RivalryMemorySurface/FactorBreakdown/PickButton/TopStatPickCard) 는
 * 각자의 __tests__ 에 렌더 기반 lock-in 테스트로 별도 존재.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSrc(relPath: string): string {
  return readFileSync(join(__dirname, relPath), 'utf8');
}

describe('Korean team-name wrap sweep — app/page.tsx (KBO 순위 목록)', () => {
  const src = readSrc('../page.tsx');
  it('standings row 팀명 span 은 flex-1 인데도 whitespace-nowrap', () => {
    expect(src).toMatch(
      /text-sm font-semibold flex-1 text-gray-900 dark:text-gray-100 whitespace-nowrap/,
    );
  });
});

describe('Korean team-name wrap sweep — app/insights/page.tsx (상위 팩터 favorLabel)', () => {
  const src = readSrc('../insights/page.tsx');
  it('favorLabel span 은 w-20 shrink-0 라벨 옆에서 whitespace-nowrap', () => {
    expect(src).toMatch(/font-medium whitespace-nowrap \$\{favorColor\}/);
  });
});

describe('Korean team-name wrap sweep — app/matchup/page.tsx (팀별 매치업 grid)', () => {
  const src = readSrc('../matchup/page.tsx');
  it('grid-cols-2 카드의 팀명 span 은 whitespace-nowrap (TeamMatchupCards 와 동일 패턴)', () => {
    expect(src).toMatch(/text-sm font-medium whitespace-nowrap/);
  });
});

describe('Korean team-name wrap sweep — app/matchup/[teamA]/[teamB]/page.tsx (예측 승 배지)', () => {
  const src = readSrc('../matchup/[teamA]/[teamB]/page.tsx');
  it('"{emoji} {팀명} 승 예측" span 은 whitespace-nowrap', () => {
    expect(src).toMatch(
      /font-semibold text-brand-600 dark:text-brand-400 whitespace-nowrap/,
    );
  });
});

describe('Korean team-name wrap sweep — app/seasons/[year]/page.tsx (한국시리즈 경기 목록)', () => {
  const src = readSrc('../seasons/[year]/page.tsx');
  it('away/home 팀명+스코어 span 2곳 모두 whitespace-nowrap (w-16/w-20/w-12 고정폭 형제 옆 압축 방지)', () => {
    const matches = src.match(/whitespace-nowrap \$\{winnerHome/g) ?? [];
    expect(matches.length).toBe(2);
  });
});

describe('Korean team-name wrap sweep — app/reviews/monthly/[month]/page.tsx (팀별 적중률 목록)', () => {
  const src = readSrc('../reviews/monthly/[month]/page.tsx');
  it('w-24 shrink-0 고정폭 팀명 span 은 truncate', () => {
    expect(src).toMatch(/w-24 shrink-0 font-medium truncate/);
  });
});

describe('Korean team-name wrap sweep — app/reviews/weekly/[week]/page.tsx (팀별 적중률 목록)', () => {
  const src = readSrc('../reviews/weekly/[week]/page.tsx');
  it('w-24 shrink-0 고정폭 팀명 span 은 truncate', () => {
    expect(src).toMatch(/w-24 shrink-0 font-medium truncate/);
  });
});

describe('Korean team-name wrap sweep — app/analysis/page.tsx (10팩터 직접대결 배지 + 예측 요약 라인)', () => {
  const src = readSrc('../analysis/page.tsx');

  it('SP/wOBA/불펜/Elo/WAR/SFR/최근폼/xFIP/H2H/구장 10개 직접대결 배지 span 모두 whitespace-nowrap (min-w-0 flex 행에서 shrink-0 배지와 경합)', () => {
    const matches = src.match(/ml-2 font-medium whitespace-nowrap \$\{/g) ?? [];
    expect(matches.length).toBe(10);
  });

  it('"예측: {팀명} {확률}%" 요약 줄 2곳(어제 경기/이번 주) 모두 whitespace-nowrap (min-w-0 vs shrink-0 배지 경합)', () => {
    const matches = src.match(/text-xs text-gray-500 dark:text-gray-400 mt-1 whitespace-nowrap/g) ?? [];
    expect(matches.length).toBe(2);
  });
});
