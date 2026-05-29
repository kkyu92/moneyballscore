import { describe, it, expect } from 'vitest';
import {
  MLB_TEAMS,
  MLB_DIVISIONS,
  MLB_TEAMS_PRE_RENDER,
  mlbShortTeamName,
  mlbTeamDivision,
  type MlbTeamCode,
} from './mlb-teams';

describe('MLB_TEAMS', () => {
  it('30 teams', () => {
    expect(Object.keys(MLB_TEAMS)).toHaveLength(30);
  });

  it('required fields per team', () => {
    for (const [code, team] of Object.entries(MLB_TEAMS)) {
      expect(team.name).toBeTruthy();
      expect(team.shortName).toBeTruthy();
      expect(team.city).toBeTruthy();
      expect(team.stadium).toBeTruthy();
      expect(team.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(team.parkPf).toBeGreaterThan(50);
      expect(team.parkPf).toBeLessThan(200);
      expect(['AL', 'NL']).toContain(team.league);
      expect(['East', 'Central', 'West']).toContain(team.division);
      expect(code).toMatch(/^[A-Z]{2,3}$/);
    }
  });
});

describe('MLB_DIVISIONS', () => {
  it('6 divisions × 5 teams = 30', () => {
    const all: string[] = [];
    for (const lg of ['AL', 'NL'] as const) {
      for (const dv of ['East', 'Central', 'West'] as const) {
        expect(MLB_DIVISIONS[lg][dv]).toHaveLength(5);
        all.push(...MLB_DIVISIONS[lg][dv]);
      }
    }
    expect(all).toHaveLength(30);
    expect(new Set(all).size).toBe(30);
  });

  it('division team codes match MLB_TEAMS', () => {
    for (const lg of ['AL', 'NL'] as const) {
      for (const dv of ['East', 'Central', 'West'] as const) {
        for (const code of MLB_DIVISIONS[lg][dv]) {
          expect(MLB_TEAMS[code as MlbTeamCode]).toBeTruthy();
          const meta = MLB_TEAMS[code as MlbTeamCode];
          expect(meta.league).toBe(lg);
          expect(meta.division).toBe(dv);
        }
      }
    }
  });
});

describe('MLB_TEAMS_PRE_RENDER', () => {
  it('5팀 모두 MLB_TEAMS에 존재', () => {
    expect(MLB_TEAMS_PRE_RENDER).toHaveLength(5);
    for (const code of MLB_TEAMS_PRE_RENDER) {
      expect(MLB_TEAMS[code]).toBeTruthy();
    }
  });

  it('plan 명시 5팀 (LAD/NYY/BOS/CHC/SFG) 정합', () => {
    expect(MLB_TEAMS_PRE_RENDER).toEqual(['LAD', 'NYY', 'BOS', 'CHC', 'SFG']);
  });
});

describe('mlbShortTeamName', () => {
  it('알려진 코드 → shortName', () => {
    expect(mlbShortTeamName('LAD')).toBe('Dodgers');
    expect(mlbShortTeamName('NYY')).toBe('Yankees');
  });

  it('null/undefined → 빈 문자열', () => {
    expect(mlbShortTeamName(null)).toBe('');
    expect(mlbShortTeamName(undefined)).toBe('');
    expect(mlbShortTeamName('')).toBe('');
  });

  it('미지 코드 → 그대로 문자열 (crash 방지)', () => {
    expect(mlbShortTeamName('XXX')).toBe('XXX');
  });
});

describe('mlbTeamDivision', () => {
  it('알려진 코드 → league + division', () => {
    expect(mlbTeamDivision('LAD')).toEqual({ league: 'NL', division: 'West' });
    expect(mlbTeamDivision('NYY')).toEqual({ league: 'AL', division: 'East' });
    expect(mlbTeamDivision('COL')).toEqual({ league: 'NL', division: 'West' });
  });
});
