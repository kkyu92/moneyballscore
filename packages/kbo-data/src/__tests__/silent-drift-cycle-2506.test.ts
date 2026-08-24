import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// cycle 2506 fix-incident: live.ts updateGameScore() 가 동점(homeScore===awayScore)
// final 경기 winner_team_id 계산에 인라인 삼항 연산자(`homeScore > awayScore ? home : away`)를
// 써서 동점 시 away팀이 winner 로 오설정됨 (cycle 140 daily.ts fix 가 전파 안 됨, cycle 2505 lesson).
// computeWinnerTeamId 공유 헬퍼로 교체 — 동점이면 NULL 반환.

const liveSrc = readFileSync(join(__dirname, '../pipeline/live.ts'), 'utf8');

describe('silent-drift-cycle-2506 — live.ts updateGameScore 동점 winner_team_id 정정', () => {
  it('computeWinnerTeamId import', () => {
    expect(liveSrc).toContain("import { computeWinnerTeamId } from './winner-id';");
  });

  it('인라인 삼항 연산자(homeScore > awayScore ? ... : ...) winnerId 계산 제거됨', () => {
    expect(liveSrc).not.toMatch(/winnerId\s*=\s*game\.homeScore\s*>\s*game\.awayScore/);
  });

  it('winnerId 는 computeWinnerTeamId 호출로 계산', () => {
    expect(liveSrc).toContain('const winnerId = computeWinnerTeamId(');
  });
});
