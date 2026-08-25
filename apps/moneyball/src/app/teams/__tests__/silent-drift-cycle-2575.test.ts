import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SMALL_SAMPLE_N } from '@moneyball/shared';

// cycle 2575 review-code(heavy): SMALL_SAMPLE_N family 16번째 재발 — 페이지 본문은
// 소표본 힌트를 렌더링하지만 SEO 메타 description / OG / JSON-LD description은
// verifiedN 무관 raw accuracyRate% 노출 (검색엔진·소셜 미리보기가 n<5 표본의
// 오해 소지 있는 % 그대로 인덱싱). teams/[code], mlb/team/[code], en/mlb/team/[code],
// players/[id] 4개 파일 모두 동일 패턴.

const teamsKoSrc = readFileSync(
  join(__dirname, '../[code]/page.tsx'),
  'utf8',
);
const teamsMlbSrc = readFileSync(
  join(__dirname, '../../mlb/team/[code]/page.tsx'),
  'utf8',
);
const teamsMlbEnSrc = readFileSync(
  join(__dirname, '../../en/mlb/team/[code]/page.tsx'),
  'utf8',
);
const playerSrc = readFileSync(
  join(__dirname, '../../players/[id]/page.tsx'),
  'utf8',
);

describe('silent drift cycle 2575 — 팀/선수 프로필 SEO description 소표본 게이트', () => {
  it('teams/[code] generateMetadata description이 소표본 힌트 포함', () => {
    expect(teamsKoSrc).toContain('sampleHint');
    expect(teamsKoSrc).toContain('소표본 n<${SMALL_SAMPLE_N}');
  });

  it('teams/[code] JSON-LD description이 소표본 조건부 렌더링', () => {
    expect(teamsKoSrc).toMatch(/description: `KBO.*verifiedN.*SMALL_SAMPLE_N/s);
  });

  it('mlb/team/[code] JSON-LD description이 소표본 조건부 렌더링', () => {
    expect(teamsMlbSrc).toMatch(/description: `MLB.*verifiedN.*SMALL_SAMPLE_N/s);
  });

  it('en/mlb/team/[code] JSON-LD description이 소표본 조건부 렌더링', () => {
    expect(teamsMlbEnSrc).toContain('small sample n<${SMALL_SAMPLE_N}');
  });

  it('players/[id] generateMetadata + JSON-LD description 둘 다 소표본 힌트 포함', () => {
    expect(playerSrc).toContain('sampleHint');
    const descriptionMatches = playerSrc.match(/소표본 n<\$\{SMALL_SAMPLE_N\}/g) ?? [];
    expect(descriptionMatches.length).toBeGreaterThanOrEqual(2);
  });

  it('SMALL_SAMPLE_N 값은 5 (기존 상수 유지)', () => {
    expect(SMALL_SAMPLE_N).toBe(5);
  });
});
