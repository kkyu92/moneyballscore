import { describe, it, expect } from 'vitest';
import { MLB_BASE_WEIGHTS } from '@moneyball/kbo-data';

describe('/mlb/factors weight invariants', () => {
  it('exposes 15 weight keys (KBO 10 + Statcast 4 + home_elo_bonus)', () => {
    expect(Object.keys(MLB_BASE_WEIGHTS).length).toBe(15);
  });

  it('KBO 10 factor keys all present', () => {
    const kboKeys = [
      'sp_fip',
      'sp_xfip',
      'lineup_woba',
      'bullpen_fip',
      'recent_form',
      'war',
      'head_to_head',
      'park_factor',
      'elo',
      'defense_sfr',
    ] as const;
    for (const key of kboKeys) {
      expect(MLB_BASE_WEIGHTS).toHaveProperty(key);
      expect(MLB_BASE_WEIGHTS[key]).toBeGreaterThan(0);
    }
  });

  it('Statcast 4 factor keys all present', () => {
    const statcastKeys = [
      'lineup_xwoba',
      'lineup_barrel_pct',
      'sp_xwoba_against',
      'woba_std',
    ] as const;
    for (const key of statcastKeys) {
      expect(MLB_BASE_WEIGHTS).toHaveProperty(key);
      expect(MLB_BASE_WEIGHTS[key]).toBeGreaterThan(0);
    }
  });

  it('home_elo_bonus present + value > 0', () => {
    expect(MLB_BASE_WEIGHTS.home_elo_bonus).toBeGreaterThan(0);
  });

  it('all weights are positive numbers', () => {
    for (const [key, value] of Object.entries(MLB_BASE_WEIGHTS)) {
      expect(value, `${key}`).toBeGreaterThan(0);
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
