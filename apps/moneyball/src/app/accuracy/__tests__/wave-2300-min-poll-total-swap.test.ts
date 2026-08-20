import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MIN_POLL_TOTAL } from '@moneyball/shared';

// wave-2300: accuracy/page.tsx 커뮤니티 vs AI 섹션 게이트가 MIN_POLL_TOTAL 미사용,
// 별도 하드코딩 `>= 3` 로 중복 판정 — computeCommunityVsAI (buildCommunityAccuracy.ts) 는
// 이미 MIN_POLL_TOTAL 로 communityGames 를 필터링해 반환하므로 현재 값(3) 은 우연히
// 일치했지만, MIN_POLL_TOTAL 변경 시 page.tsx 게이트만 stale 하게 남는 silent drift
// 소지 (wave-305/wave-500 과 동일 family — 매직넘버 재발). review-code (heavy) cycle 2300.

const accuracySrc = readFileSync(
  join(__dirname, '../page.tsx'),
  'utf8',
);

describe('wave-2300 — accuracy/page.tsx MIN_POLL_TOTAL 상수 swap', () => {
  it('MIN_POLL_TOTAL 값은 3 (기존 상수 유지)', () => {
    expect(MIN_POLL_TOTAL).toBe(3);
  });

  it('accuracy/page.tsx: MIN_POLL_TOTAL import 존재', () => {
    expect(accuracySrc).toContain('MIN_POLL_TOTAL');
  });

  it('accuracy/page.tsx: communityGames >= 3 하드코딩 없음', () => {
    expect(accuracySrc).not.toContain('communityGames >= 3');
    expect(accuracySrc).toContain('communityGames >= MIN_POLL_TOTAL');
  });
});
