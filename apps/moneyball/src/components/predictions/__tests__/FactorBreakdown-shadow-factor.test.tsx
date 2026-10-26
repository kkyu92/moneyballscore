import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { KBO_FACTOR_COUNT } from '@moneyball/shared';
import { FactorBreakdown } from '../FactorBreakdown';

// Silent drift fix (cycle 3643, review-code(heavy) components/predictions sweep):
// predictor.ts always writes factors.park_weather / factors.umpire_sz = 0.5
// (shadow-only, production weight=0 — M-F1/M-F2, cycle 1013) into every stored
// prediction's `factors` object. The default (chart=false) view used
// `key in DEFAULT_WEIGHTS`, which doesn't exclude these 2 shadow keys (they're
// real DEFAULT_WEIGHTS entries at weight=0) — so /predictions/[date] always
// rendered 12 rows instead of 10, leaking two always-neutral shadow rows into
// a view whose own contract says shadow rows render only when chart=true.
// Sibling component DetailedFactorAnalysis.tsx already fixed this with
// ACTIVE_FACTOR_KEYS filtering (see DetailedFactorAnalysis-shadow-factor.test.tsx);
// this locks in the same fix here.
describe('FactorBreakdown — shadow factor exclusion (chart=false default)', () => {
  it('renders exactly KBO_FACTOR_COUNT rows and excludes shadow factors when chart is not set', () => {
    const factors: Record<string, number> = {
      sp_fip: 0.6,
      sp_xfip: 0.5,
      lineup_woba: 0.5,
      bullpen_fip: 0.5,
      recent_form: 0.5,
      war: 0.5,
      head_to_head: 0.5,
      park_factor: 0.5,
      elo: 0.5,
      sfr: 0.5,
      // always present on real prediction rows (predictor.ts #11/#12), must not leak into default view
      park_weather: 0.5,
      umpire_sz: 0.5,
    };

    const { container } = render(
      <FactorBreakdown homeTeam="LG" awayTeam="HT" factors={factors} />,
    );

    const rows = container.querySelectorAll('[data-factor]');
    expect(rows.length).toBe(KBO_FACTOR_COUNT);
    expect(container.querySelector('[data-factor="park_weather"]')).toBeNull();
    expect(container.querySelector('[data-factor="umpire_sz"]')).toBeNull();
  });

  it('renders shadow rows when chart=true', () => {
    const factors: Record<string, number> = {
      sp_fip: 0.6,
      sp_xfip: 0.5,
      lineup_woba: 0.5,
      bullpen_fip: 0.5,
      recent_form: 0.5,
      war: 0.5,
      head_to_head: 0.5,
      park_factor: 0.5,
      elo: 0.5,
      sfr: 0.5,
    };

    const { container } = render(
      <FactorBreakdown homeTeam="LG" awayTeam="HT" factors={factors} chart />,
    );

    expect(container.querySelector('[data-factor="park_weather"]')).not.toBeNull();
    expect(container.querySelector('[data-factor="umpire_sz"]')).not.toBeNull();
  });
});
