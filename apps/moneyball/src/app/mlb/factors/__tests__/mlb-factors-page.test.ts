import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  MLB_BASE_WEIGHTS,
  MLB_KBO_FACTOR_KEYS,
  MLB_STATCAST_FACTOR_KEYS,
  MLB_FACTOR_COUNTS,
  MLB_PLACEHOLDER_FACTOR_KEYS,
} from '@moneyball/kbo-data';

const PAGE_SRC = readFileSync(join(__dirname, '../page.tsx'), 'utf-8');

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

describe('/mlb/factors placeholder-factor banner (cycle 2512 silent drift fix)', () => {
  it('page derives banner from MLB_PLACEHOLDER_FACTOR_KEYS, not a stale hardcoded list', () => {
    expect(PAGE_SRC).toContain('MLB_PLACEHOLDER_FACTOR_KEYS');
    expect(PAGE_SRC).not.toContain('최근폼·상대전적·수비 SFR');
  });

  it('recent_form/head_to_head/elo are wired (cycle 2349/2353) so must NOT be placeholders', () => {
    expect(MLB_PLACEHOLDER_FACTOR_KEYS).not.toContain('recent_form');
    expect(MLB_PLACEHOLDER_FACTOR_KEYS).not.toContain('head_to_head');
    expect(MLB_PLACEHOLDER_FACTOR_KEYS).not.toContain('elo');
  });

  it('defense_sfr/sp_xwoba_against/woba_std remain the known placeholders (cycle 2402)', () => {
    expect([...MLB_PLACEHOLDER_FACTOR_KEYS].sort()).toEqual(
      ['defense_sfr', 'sp_xwoba_against', 'woba_std'].sort(),
    );
  });
});
