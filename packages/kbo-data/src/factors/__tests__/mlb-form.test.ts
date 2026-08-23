import { describe, it, expect } from 'vitest';
import { calculateMlbRecentForm, calculateMlbHeadToHead, type MlbFinishedGameForForm } from '../mlb-form';

function game(
  home_team_code: string,
  away_team_code: string,
  home_score: number | null,
  away_score: number | null,
): MlbFinishedGameForForm {
  return { home_team_code, away_team_code, home_score, away_score };
}

describe('calculateMlbRecentForm', () => {
  it('경기 데이터 없으면 null', () => {
    expect(calculateMlbRecentForm([], 'NYY', 10)).toBeNull();
  });

  it('홈/원정 혼합 최근 N경기 승률 (desc 정렬 가정)', () => {
    const games = [
      game('NYY', 'BOS', 5, 2), // NYY 홈 승
      game('TB', 'NYY', 3, 4), // NYY 원정 승
      game('NYY', 'BAL', 1, 6), // NYY 홈 패
    ];
    expect(calculateMlbRecentForm(games, 'NYY', 10)).toBeCloseTo(2 / 3, 5);
  });

  it('lastN 슬라이스 — desc 정렬된 앞 N경기만', () => {
    const games = [
      game('NYY', 'BOS', 5, 2), // win (최신)
      game('NYY', 'BOS', 1, 2), // loss
      game('NYY', 'BOS', 5, 2), // win (오래됨, lastN=2 제외)
    ];
    expect(calculateMlbRecentForm(games, 'NYY', 2)).toBeCloseTo(0.5, 5);
  });

  it('스코어 결측 경기는 판정 불가로 제외', () => {
    const games = [game('NYY', 'BOS', null, null), game('NYY', 'BOS', 5, 2)];
    expect(calculateMlbRecentForm(games, 'NYY', 10)).toBe(1);
  });

  it('해당 팀 경기 없으면 null', () => {
    const games = [game('TB', 'BOS', 5, 2)];
    expect(calculateMlbRecentForm(games, 'NYY', 10)).toBeNull();
  });

  it('동점 스코어(데이터 이상)는 패 아닌 판정 불가로 제외', () => {
    const games = [
      game('NYY', 'BOS', 3, 3), // 동점 — 제외 (패로 오집계 X)
      game('NYY', 'BOS', 5, 2), // NYY 승
    ];
    expect(calculateMlbRecentForm(games, 'NYY', 10)).toBe(1);
  });
});

describe('calculateMlbHeadToHead', () => {
  it('경기 없으면 0/0', () => {
    expect(calculateMlbHeadToHead([], 'NYY', 'BOS')).toEqual({ wins: 0, losses: 0 });
  });

  it('과거 홈/원정 뒤바뀐 매치업도 homeTeamCode 관점으로 집계', () => {
    const games = [
      game('NYY', 'BOS', 5, 2), // NYY(현재 홈팀) 승
      game('BOS', 'NYY', 6, 1), // NYY 원정에서 패 (BOS 홈 승)
      game('NYY', 'BOS', 2, 3), // NYY 패
    ];
    expect(calculateMlbHeadToHead(games, 'NYY', 'BOS')).toEqual({ wins: 1, losses: 2 });
  });

  it('무관한 매치업 제외', () => {
    const games = [game('NYY', 'TB', 5, 2), game('BOS', 'BAL', 3, 1)];
    expect(calculateMlbHeadToHead(games, 'NYY', 'BOS')).toEqual({ wins: 0, losses: 0 });
  });

  it('스코어 결측 경기 제외', () => {
    const games = [game('NYY', 'BOS', null, null)];
    expect(calculateMlbHeadToHead(games, 'NYY', 'BOS')).toEqual({ wins: 0, losses: 0 });
  });

  it('동점 스코어(데이터 이상)는 패 아닌 판정 불가로 제외', () => {
    const games = [
      game('NYY', 'BOS', 3, 3), // 동점 — 제외 (NYY 패로 오집계 X)
      game('NYY', 'BOS', 5, 2), // NYY 승
    ];
    expect(calculateMlbHeadToHead(games, 'NYY', 'BOS')).toEqual({ wins: 1, losses: 0 });
  });
});
