import { describe, it, expect } from 'vitest';
import type { League, MlbStatcast, MlbBase14Factor } from '../types';

describe('MLB types', () => {
  it('League union includes mlb and kbo', () => {
    const leagues: League[] = ['kbo', 'mlb'];
    expect(leagues).toHaveLength(2);
  });

  it('MlbStatcast contains 4 factors', () => {
    const sample: MlbStatcast = {
      xwoba: 0.342,
      barrel_pct: 9.1,
      hard_hit_pct: 38.5,
      launch_angle: 12.3,
    };
    expect(Object.keys(sample)).toHaveLength(4);
  });

  it('MlbBase14Factor sums to 1.0 weight (with HOME_ELO_BONUS)', () => {
    const weights: MlbBase14Factor = {
      sp_fip: 0.12, sp_xfip: 0.03, lineup_woba: 0.10,
      bullpen_fip: 0.10, recent_form: 0.10, war: 0.08,
      head_to_head: 0.03, park_factor: 0.04, elo: 0.10,
      defense_sfr: 0.05,
      lineup_xwoba: 0.05, lineup_barrel_pct: 0.03,
      sp_xwoba_against: 0.04, woba_std: 0.03,
      home_elo_bonus: 0.10,
    };
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });
});
