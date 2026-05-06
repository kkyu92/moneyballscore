import { describe, expect, it } from 'vitest';
import { computeWinnerTeamId } from '../pipeline/winner-id';

const HOME = 1;
const AWAY = 2;

describe('computeWinnerTeamId', () => {
  it('home 우세 final → home id', () => {
    expect(computeWinnerTeamId('final', 5, 3, HOME, AWAY)).toBe(HOME);
  });

  it('away 우세 final → away id', () => {
    expect(computeWinnerTeamId('final', 2, 7, HOME, AWAY)).toBe(AWAY);
  });

  it('동점 final → null (12회 무승부 회귀 가드)', () => {
    expect(computeWinnerTeamId('final', 4, 4, HOME, AWAY)).toBeNull();
  });

  it('0-0 동점 final → null (콜드 무승부)', () => {
    expect(computeWinnerTeamId('final', 0, 0, HOME, AWAY)).toBeNull();
  });

  it('status !== final → null', () => {
    expect(computeWinnerTeamId('scheduled', 5, 3, HOME, AWAY)).toBeNull();
    expect(computeWinnerTeamId('live', 5, 3, HOME, AWAY)).toBeNull();
    expect(computeWinnerTeamId('postponed', null, null, HOME, AWAY)).toBeNull();
  });

  it('score 한쪽 null → null (KBO API 미반영)', () => {
    expect(computeWinnerTeamId('final', null, 3, HOME, AWAY)).toBeNull();
    expect(computeWinnerTeamId('final', 5, null, HOME, AWAY)).toBeNull();
    expect(computeWinnerTeamId('final', undefined, undefined, HOME, AWAY)).toBeNull();
  });

  it('home_score=0, away_score=1 → away id (0 falsy 가드 회귀)', () => {
    expect(computeWinnerTeamId('final', 0, 1, HOME, AWAY)).toBe(AWAY);
  });

  it('home_score=1, away_score=0 → home id', () => {
    expect(computeWinnerTeamId('final', 1, 0, HOME, AWAY)).toBe(HOME);
  });
});
