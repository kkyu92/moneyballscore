import { describe, it, expect } from 'vitest';
import {
  MLB_TEAMS,
  MLB_DIVISIONS,
  MLB_TEAMS_PRE_RENDER,
  MLB_STATSAPI_TEAM_ALIASES,
  normalizeMlbTeamCode,
  toMlbStatsApiCode,
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

  it('StatsAPI 컨벤션 코드(DB 실측) → alias 경유 shortName (cycle 2081 사례)', () => {
    expect(mlbShortTeamName('TB')).toBe('Rays');
    expect(mlbShortTeamName('CWS')).toBe('White Sox');
    expect(mlbShortTeamName('KC')).toBe('Royals');
    expect(mlbShortTeamName('SD')).toBe('Padres');
    expect(mlbShortTeamName('SF')).toBe('Giants');
    expect(mlbShortTeamName('AZ')).toBe('Diamondbacks');
    expect(mlbShortTeamName('WSH')).toBe('Nationals');
  });
});

// cycle 2081 fix-incident (heavy) — mlb_schedule/mlb_team_stats/mlb_team_elo 는 StatsAPI
// team.abbreviation 원본 저장(TB/CWS/KC/SD/SF/AZ/WSH), MLB_TEAMS 키는 Baseball-Reference
// 표준(TBR/CHW/KCR/SDP/SFG/ARI/WSN) — 이 7팀 불일치로 park factor/matchup DB 쿼리가
// silent 히 neutral fallback 또는 0건 매칭됐던 근본 원인. DB 실측(759 rows) 으로 확인한
// distinct 코드 목록 = 정확히 이 7개 alias.
describe('MLB_STATSAPI_TEAM_ALIASES', () => {
  it('정확히 7팀 — DB 실측(cycle 2081) distinct 코드와 정합', () => {
    expect(Object.keys(MLB_STATSAPI_TEAM_ALIASES).sort()).toEqual(
      ['AZ', 'CWS', 'KC', 'SD', 'SF', 'TB', 'WSH'].sort(),
    );
  });

  it('모든 alias 값이 MLB_TEAMS 유효 키', () => {
    for (const canonical of Object.values(MLB_STATSAPI_TEAM_ALIASES)) {
      expect(MLB_TEAMS[canonical]).toBeTruthy();
    }
  });
});

describe('normalizeMlbTeamCode', () => {
  it('canonical 코드는 그대로 반환', () => {
    expect(normalizeMlbTeamCode('LAD')).toBe('LAD');
  });

  it('StatsAPI alias 코드 → canonical 변환', () => {
    expect(normalizeMlbTeamCode('TB')).toBe('TBR');
    expect(normalizeMlbTeamCode('CWS')).toBe('CHW');
    expect(normalizeMlbTeamCode('KC')).toBe('KCR');
    expect(normalizeMlbTeamCode('SD')).toBe('SDP');
    expect(normalizeMlbTeamCode('SF')).toBe('SFG');
    expect(normalizeMlbTeamCode('AZ')).toBe('ARI');
    expect(normalizeMlbTeamCode('WSH')).toBe('WSN');
  });

  it('null/undefined/미지 코드 → undefined', () => {
    expect(normalizeMlbTeamCode(null)).toBeUndefined();
    expect(normalizeMlbTeamCode(undefined)).toBeUndefined();
    expect(normalizeMlbTeamCode('XXX')).toBeUndefined();
  });
});

describe('toMlbStatsApiCode', () => {
  it('alias 있는 7팀 → StatsAPI 코드 역변환', () => {
    expect(toMlbStatsApiCode('TBR')).toBe('TB');
    expect(toMlbStatsApiCode('CHW')).toBe('CWS');
    expect(toMlbStatsApiCode('KCR')).toBe('KC');
    expect(toMlbStatsApiCode('SDP')).toBe('SD');
    expect(toMlbStatsApiCode('SFG')).toBe('SF');
    expect(toMlbStatsApiCode('ARI')).toBe('AZ');
    expect(toMlbStatsApiCode('WSN')).toBe('WSH');
  });

  it('alias 없는 팀은 코드 그대로', () => {
    expect(toMlbStatsApiCode('LAD')).toBe('LAD');
    expect(toMlbStatsApiCode('NYY')).toBe('NYY');
  });

  it('normalizeMlbTeamCode 와 왕복 일치(round-trip)', () => {
    for (const [statsApiCode, canonical] of Object.entries(MLB_STATSAPI_TEAM_ALIASES)) {
      expect(toMlbStatsApiCode(canonical)).toBe(statsApiCode);
      expect(normalizeMlbTeamCode(statsApiCode)).toBe(canonical);
    }
  });
});

describe('mlbTeamDivision', () => {
  it('알려진 코드 → league + division', () => {
    expect(mlbTeamDivision('LAD')).toEqual({ league: 'NL', division: 'West' });
    expect(mlbTeamDivision('NYY')).toEqual({ league: 'AL', division: 'East' });
    expect(mlbTeamDivision('COL')).toEqual({ league: 'NL', division: 'West' });
  });
});
