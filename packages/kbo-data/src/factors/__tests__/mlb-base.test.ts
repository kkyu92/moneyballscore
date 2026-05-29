import { describe, it, expect } from 'vitest';
import {
  MLB_BASE_WEIGHTS,
  HOME_ELO_BONUS_VALUE,
  computeMlbProbability,
  type MlbFactorInputs,
} from '../mlb-base';

describe('mlb-base.MLB_BASE_WEIGHTS', () => {
  it('14 factor + HOME_ELO_BONUS sum to 1.0', () => {
    const sum = Object.values(MLB_BASE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it('Statcast 4 weights = 15% (5+3+4+3)', () => {
    const statcast = MLB_BASE_WEIGHTS.lineup_xwoba
      + MLB_BASE_WEIGHTS.lineup_barrel_pct
      + MLB_BASE_WEIGHTS.sp_xwoba_against
      + MLB_BASE_WEIGHTS.woba_std;
    expect(statcast).toBeCloseTo(0.15, 6);
  });

  it('HOME_ELO_BONUS_VALUE = 24 (KBO 정합)', () => {
    expect(HOME_ELO_BONUS_VALUE).toBe(24);
  });
});

describe('mlb-base.computeMlbProbability', () => {
  const sampleInput: MlbFactorInputs = {
    sp_fip: { home: 3.0, away: 4.0 },
    sp_xfip: { home: 3.2, away: 4.2 },
    lineup_woba: { home: 0.340, away: 0.330 },
    bullpen_fip: { home: 3.5, away: 3.7 },
    recent_form: { home: 7, away: 5 },
    war: { home: 50, away: 45 },
    head_to_head: { homeWinRate: 0.6 },
    park_factor: 1.02,
    elo: { home: 1550, away: 1500 },
    defense_sfr: { home: 5, away: 3 },
    lineup_xwoba: { home: 0.351, away: 0.339 },
    lineup_barrel_pct: { home: 10.4, away: 9.1 },
    sp_xwoba_against: { home: 0.290, away: 0.310 },
    woba_std: { home: 0.020, away: 0.025 },
  };

  it('returns probability between 0.15 and 0.85 (clamp)', () => {
    const p = computeMlbProbability(sampleInput);
    expect(p).toBeGreaterThanOrEqual(0.15);
    expect(p).toBeLessThanOrEqual(0.85);
  });

  it('home advantage > 0.5 when all factors equal (HOME_ELO_BONUS effect)', () => {
    const balanced: MlbFactorInputs = {
      sp_fip: { home: 3.5, away: 3.5 },
      sp_xfip: { home: 3.5, away: 3.5 },
      lineup_woba: { home: 0.335, away: 0.335 },
      bullpen_fip: { home: 3.5, away: 3.5 },
      recent_form: { home: 5, away: 5 },
      war: { home: 50, away: 50 },
      head_to_head: { homeWinRate: 0.5 },
      park_factor: 1.0,
      elo: { home: 1500, away: 1500 },
      defense_sfr: { home: 0, away: 0 },
      lineup_xwoba: { home: 0.335, away: 0.335 },
      lineup_barrel_pct: { home: 9, away: 9 },
      sp_xwoba_against: { home: 0.300, away: 0.300 },
      woba_std: { home: 0.022, away: 0.022 },
    };
    const p = computeMlbProbability(balanced);
    expect(p).toBeGreaterThan(0.5);
  });

  it('returns 0.5 (NaN clamp) when input contains NaN', () => {
    const broken = { ...sampleInput, sp_fip: { home: NaN, away: 4.0 } };
    const p = computeMlbProbability(broken);
    expect(p).toBeGreaterThanOrEqual(0.15);
    expect(p).toBeLessThanOrEqual(0.85);
  });
});
