import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { KBO_FACTOR_COUNT } from '@moneyball/shared';
import { DetailedFactorAnalysis } from '../DetailedFactorAnalysis';

// Silent drift fix (op-analysis sweep): predictor.ts always writes
// factors.park_weather / factors.umpire_sz = 0.5 neutral into the stored
// `factors` object (shadow-only, production weight=0 — M-F1/M-F2, cycle
// 1013), but the old `key in DEFAULT_WEIGHTS` filter here didn't exclude
// them (DEFAULT_WEIGHTS has 12 keys, not 10). That rendered 2 extra rows
// labeled with the raw, untranslated keys "park_weather"/"umpire_sz"
// (no entry in FACTOR_LABELS_TECHNICAL) directly under a header stating
// "{KBO_FACTOR_COUNT}개 팩터" (10) — row count contradicted the header text.
describe('DetailedFactorAnalysis — shadow factor exclusion', () => {
  it('renders exactly KBO_FACTOR_COUNT rows and never the raw shadow factor keys', () => {
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
      // always present on real prediction rows (predictor.ts #11/#12), must not leak into UI
      park_weather: 0.5,
      umpire_sz: 0.5,
    };

    const { container } = render(
      <DetailedFactorAnalysis
        homeTeam="LG"
        awayTeam="HT"
        factors={factors}
        details={{}}
      />,
    );

    const rows = container.querySelectorAll('article');
    expect(rows.length).toBe(KBO_FACTOR_COUNT);
    expect(container.textContent).not.toContain('park_weather');
    expect(container.textContent).not.toContain('umpire_sz');
  });
});
