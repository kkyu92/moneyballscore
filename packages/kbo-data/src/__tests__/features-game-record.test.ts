import { describe, it, expect } from 'vitest';
import {
  shiftDate,
  bullpenInningsLastNDays,
  bullpenAppearancesLastNDays,
  teamRunsPerGameLastN,
  teamRunsAllowedPerGameLastN,
  teamRunDiffLastN,
  teamHomeRunsLastN,
  type GameRecordLite,
} from '../features/game-record-features';
import type { NaverPitcherRecord } from '../scrapers/naver-record';

function pitcher(
  name: string,
  inn: string,
  hr = 0,
): NaverPitcherRecord {
  return {
    name,
    pcode: name,
    tb: 'B',
    inn,
    bf: 10,
    pa: 10,
    ab: 10,
    hit: 2,
    hr,
    kk: 3,
    bb: 1,
    bbhp: 0,
    r: 1,
    er: 1,
    era: '2.50',
    wls: '',
    w: 0,
    l: 0,
    s: 0,
    gameCount: 1,
    seasonWin: 0,
    seasonLose: 0,
    hasPlayerEnd: true,
  };
}

function gameRecord(
  overrides: Partial<GameRecordLite> & Pick<GameRecordLite, 'gameDate' | 'homeTeamId' | 'awayTeamId'>,
): GameRecordLite {
  return {
    gameId: 1,
    homeScore: 5,
    awayScore: 3,
    pitchersHome: [pitcher('SP-H', '6')],
    pitchersAway: [pitcher('SP-A', '5')],
    ...overrides,
  };
}

describe('shiftDate', () => {
  it('subtracts days', () => {
    expect(shiftDate('2026-04-22', -3)).toBe('2026-04-19');
    expect(shiftDate('2026-05-01', -1)).toBe('2026-04-30');
  });

  it('adds days', () => {
    expect(shiftDate('2026-04-22', 2)).toBe('2026-04-24');
  });
});

describe('bullpenInningsLastNDays', () => {
  it('sums bullpen innings in last N days window for the team', () => {
    const records: GameRecordLite[] = [
      gameRecord({
        gameDate: '2026-04-20',
        homeTeamId: 1,
        awayTeamId: 2,
        pitchersHome: [pitcher('SP', '5'), pitcher('RP1', '2'), pitcher('CL', '1')],
        pitchersAway: [pitcher('SP', '6'), pitcher('RP', '3')],
      }),
      gameRecord({
        gameDate: '2026-04-21',
        homeTeamId: 2,
        awayTeamId: 1,
        pitchersHome: [pitcher('SP', '7')],
        pitchersAway: [pitcher('SP', '5'), pitcher('RP', '3')],
      }),
    ];
    // 팀 1: 4-20 홈 불펜 2+1=3 / 4-21 원정 불펜 3 = 6
    const sum = bullpenInningsLastNDays(records, 1, '2026-04-22', 3);
    expect(sum).toBeCloseTo(6, 3);
  });

  it('returns 0 when team has no prior games', () => {
    expect(
      bullpenInningsLastNDays([], 1, '2026-04-22', 3),
    ).toBe(0);
  });

  it('excludes games outside window', () => {
    const records: GameRecordLite[] = [
      gameRecord({
        gameDate: '2026-04-10', // 12일 전
        homeTeamId: 1,
        awayTeamId: 2,
        pitchersHome: [pitcher('SP', '5'), pitcher('RP', '4')],
      }),
    ];
    expect(bullpenInningsLastNDays(records, 1, '2026-04-22', 3)).toBe(0);
  });
});

describe('bullpenAppearancesLastNDays', () => {
  it('counts non-starter pitchers in window', () => {
    const records: GameRecordLite[] = [
      gameRecord({
        gameDate: '2026-04-21',
        homeTeamId: 1,
        awayTeamId: 2,
        pitchersHome: [pitcher('SP', '5'), pitcher('A', '2'), pitcher('B', '1'), pitcher('C', '1')],
      }),
    ];
    expect(bullpenAppearancesLastNDays(records, 1, '2026-04-22', 3)).toBe(3);
  });
});

describe('teamRunsPerGameLastN', () => {
  it('averages self runs over recent N games', () => {
    const records: GameRecordLite[] = [
      gameRecord({ gameDate: '2026-04-21', homeTeamId: 1, awayTeamId: 2, homeScore: 6, awayScore: 5 }),
      gameRecord({ gameDate: '2026-04-20', homeTeamId: 2, awayTeamId: 1, homeScore: 4, awayScore: 8 }),
      gameRecord({ gameDate: '2026-04-19', homeTeamId: 1, awayTeamId: 3, homeScore: 2, awayScore: 7 }),
    ];
    // 팀 1: 21일 홈 6 / 20일 원정 8 / 19일 홈 2 → (6+8+2)/3 = 5.33
    expect(teamRunsPerGameLastN(records, 1, '2026-04-22', 5)).toBeCloseTo(5.333, 2);
    // N=2 — 가장 최근 2경기: 21일 6, 20일 8 → 7
    expect(teamRunsPerGameLastN(records, 1, '2026-04-22', 2)).toBeCloseTo(7.0, 2);
  });

  it('returns 0 when no games', () => {
    expect(teamRunsPerGameLastN([], 1, '2026-04-22', 5)).toBe(0);
  });
});

describe('teamRunsAllowedPerGameLastN', () => {
  it('averages opponent runs (allowed)', () => {
    const records: GameRecordLite[] = [
      gameRecord({ gameDate: '2026-04-21', homeTeamId: 1, awayTeamId: 2, homeScore: 6, awayScore: 5 }),
      gameRecord({ gameDate: '2026-04-20', homeTeamId: 2, awayTeamId: 1, homeScore: 4, awayScore: 8 }),
    ];
    // 팀 1: 21일 홈 → allowed 5 / 20일 원정 → allowed 4 = avg 4.5
    expect(teamRunsAllowedPerGameLastN(records, 1, '2026-04-22', 5)).toBeCloseTo(4.5, 2);
  });
});

describe('teamRunDiffLastN', () => {
  it('computes runs - allowed avg', () => {
    const records: GameRecordLite[] = [
      gameRecord({ gameDate: '2026-04-21', homeTeamId: 1, awayTeamId: 2, homeScore: 10, awayScore: 2 }),
    ];
    expect(teamRunDiffLastN(records, 1, '2026-04-22', 5)).toBe(8);
  });
});

describe('teamHomeRunsLastN', () => {
  it('sums opposite-team pitchers hr (self offense HR)', () => {
    const records: GameRecordLite[] = [
      gameRecord({
        gameDate: '2026-04-21',
        homeTeamId: 1,
        awayTeamId: 2,
        pitchersHome: [pitcher('SP', '5', 0)], // 팀 1 홈 — 상대는 awayPitchers
        pitchersAway: [pitcher('SP', '4', 2), pitcher('RP', '3', 1)], // 팀 1이 이 투수들 상대로 HR 친 것 = 3
      }),
    ];
    expect(teamHomeRunsLastN(records, 1, '2026-04-22', 5)).toBe(3);
  });
});
