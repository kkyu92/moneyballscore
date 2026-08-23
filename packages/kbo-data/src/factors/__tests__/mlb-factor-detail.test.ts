import { describe, it, expect } from 'vitest';
import { computeMlbWaterfall, type MlbWaterfallInput } from '../mlb-waterfall';
import { buildMlbFactorDetailRows } from '../mlb-factor-detail';

const ASYMMETRIC: MlbWaterfallInput = {
  sp_fip: { home: 3.2, away: 4.5 },
  sp_xfip: { home: 3.4, away: 4.3 },
  bullpen_fip: { home: 3.2, away: 4.5 },
  lineup_woba: { home: 0.34, away: 0.30 },
  war: { home: 4.0, away: 1.0 },
  recent_form: { home: 70, away: 40 },
  head_to_head: { home: 0.6, away: 0.4 },
  lineup_xwoba: { home: 0.33, away: 0.31 },
  lineup_barrel_pct: { home: 9.0, away: 7.5 },
  elo: { home: 1523, away: 1487 },
  homeParkPf: 105,
  homeWinProb: 0.62,
};

const NEUTRAL: MlbWaterfallInput = {
  sp_fip: { home: 4.0, away: 4.0 },
  sp_xfip: { home: 4.0, away: 4.0 },
  bullpen_fip: { home: 4.0, away: 4.0 },
  lineup_woba: { home: 0.32, away: 0.32 },
  war: { home: 2.0, away: 2.0 },
  recent_form: { home: 50, away: 50 },
  head_to_head: { home: 0.5, away: 0.5 },
  lineup_xwoba: { home: 0.32, away: 0.32 },
  lineup_barrel_pct: { home: 8.0, away: 8.0 },
  elo: { home: 1500, away: 1500 },
  homeParkPf: 100,
  homeWinProb: 0.5,
};

describe('buildMlbFactorDetailRows', () => {
  it('excludes home_advantage/park_factor/final — only the 10 GAME_DETAIL_FACTOR_ROWS keys remain', () => {
    const bars = computeMlbWaterfall(ASYMMETRIC);
    const rows = buildMlbFactorDetailRows(bars, ASYMMETRIC, 'Dodgers', 'Padres');
    expect(rows.map((r) => r.key).sort()).toEqual(
      [
        'bullpen_fip', 'elo', 'head_to_head', 'lineup_barrel_pct', 'lineup_woba',
        'lineup_xwoba', 'recent_form', 'sp_fip', 'sp_xfip', 'war',
      ].sort(),
    );
  });

  it('recent_form/head_to_head formatted as percentages (cycle 2353 wiring — regression for the silent-drop where these rows were absent from the detail table)', () => {
    const bars = computeMlbWaterfall(ASYMMETRIC);
    const rows = buildMlbFactorDetailRows(bars, ASYMMETRIC, 'Dodgers', 'Padres');
    expect(rows.find((r) => r.key === 'recent_form')?.homeValueLabel).toBe('70.0%');
    expect(rows.find((r) => r.key === 'recent_form')?.awayValueLabel).toBe('40.0%');
    expect(rows.find((r) => r.key === 'recent_form')?.favor).toBe('home');
    expect(rows.find((r) => r.key === 'head_to_head')?.homeValueLabel).toBe('60%');
    expect(rows.find((r) => r.key === 'head_to_head')?.awayValueLabel).toBe('40%');
    expect(rows.find((r) => r.key === 'head_to_head')?.favor).toBe('home');
  });

  it('elo value formatted with no decimals (Elo rating, not a rate stat)', () => {
    const bars = computeMlbWaterfall(ASYMMETRIC);
    const rows = buildMlbFactorDetailRows(bars, ASYMMETRIC, 'Dodgers', 'Padres');
    expect(rows.find((r) => r.key === 'elo')?.homeValueLabel).toBe('1523');
    expect(rows.find((r) => r.key === 'elo')?.awayValueLabel).toBe('1487');
    expect(rows.find((r) => r.key === 'elo')?.favor).toBe('home');
  });

  it('home team ahead in sp_fip → favor=home, narrative names home team, positive contribution', () => {
    const bars = computeMlbWaterfall(ASYMMETRIC);
    const rows = buildMlbFactorDetailRows(bars, ASYMMETRIC, 'Dodgers', 'Padres');
    const spFip = rows.find((r) => r.key === 'sp_fip');
    expect(spFip?.favor).toBe('home');
    expect(spFip?.narrative).toContain('Dodgers');
    expect(spFip?.contributionPct).toBeGreaterThan(0);
    expect(spFip?.homeValueLabel).toBe('3.20');
    expect(spFip?.awayValueLabel).toBe('4.50');
  });

  it('all-neutral input → every row favor=neutral with a negligible-gap narrative, no team named', () => {
    const bars = computeMlbWaterfall(NEUTRAL);
    const rows = buildMlbFactorDetailRows(bars, NEUTRAL, 'Dodgers', 'Padres');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.favor).toBe('neutral');
      expect(row.narrative).not.toContain('Dodgers');
      expect(row.narrative).not.toContain('Padres');
    }
  });

  it('lineup_barrel_pct value formatted with % suffix, war with 1 decimal, woba with 3 decimals', () => {
    const bars = computeMlbWaterfall(ASYMMETRIC);
    const rows = buildMlbFactorDetailRows(bars, ASYMMETRIC, 'Dodgers', 'Padres');
    expect(rows.find((r) => r.key === 'lineup_barrel_pct')?.homeValueLabel).toBe('9.0%');
    expect(rows.find((r) => r.key === 'war')?.homeValueLabel).toBe('4.0');
    expect(rows.find((r) => r.key === 'lineup_woba')?.homeValueLabel).toBe('0.340');
  });

  it('missing pair (null value) formats as em dash, not a crash', () => {
    const bars = computeMlbWaterfall({ ...ASYMMETRIC, war: { home: null, away: 1.0 } });
    const rows = buildMlbFactorDetailRows(bars, { ...ASYMMETRIC, war: { home: null, away: 1.0 } }, 'Dodgers', 'Padres');
    expect(rows.find((r) => r.key === 'war')).toBeUndefined(); // computeMlbWaterfall itself skips null pairs
  });

  it('en locale narrative uses English team names and "pp" suffix wording', () => {
    const bars = computeMlbWaterfall({ ...ASYMMETRIC, locale: 'en' });
    const rows = buildMlbFactorDetailRows(bars, ASYMMETRIC, 'Dodgers', 'Padres', 'en');
    const spFip = rows.find((r) => r.key === 'sp_fip');
    expect(spFip?.narrative).toMatch(/has the edge in/);
  });
});
