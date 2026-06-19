import { describe, it, expect } from 'vitest';
import {
  MLB_BASE_WEIGHTS,
  MLB_KBO_FACTOR_KEYS,
  MLB_STATCAST_FACTOR_KEYS,
  MLB_FACTOR_COUNTS,
} from '@moneyball/kbo-data';

describe('/mlb/factors weight invariants', () => {
  it('exposes weight keys = KBO + Statcast + home_elo_bonus', () => {
    expect(Object.keys(MLB_BASE_WEIGHTS).length).toBe(MLB_FACTOR_COUNTS.total + 1);
  });

  it('KBO factor keys all present', () => {
    for (const key of MLB_KBO_FACTOR_KEYS) {
      expect(MLB_BASE_WEIGHTS).toHaveProperty(key);
      expect(MLB_BASE_WEIGHTS[key]).toBeGreaterThan(0);
    }
  });

  it('Statcast factor keys all present', () => {
    for (const key of MLB_STATCAST_FACTOR_KEYS) {
      expect(MLB_BASE_WEIGHTS).toHaveProperty(key);
      expect(MLB_BASE_WEIGHTS[key]).toBeGreaterThan(0);
    }
  });

  it('MLB_FACTOR_COUNTS derived from registry arrays', () => {
    expect(MLB_FACTOR_COUNTS.kbo).toBe(MLB_KBO_FACTOR_KEYS.length);
    expect(MLB_FACTOR_COUNTS.statcast).toBe(MLB_STATCAST_FACTOR_KEYS.length);
    expect(MLB_FACTOR_COUNTS.total).toBe(MLB_KBO_FACTOR_KEYS.length + MLB_STATCAST_FACTOR_KEYS.length);
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
