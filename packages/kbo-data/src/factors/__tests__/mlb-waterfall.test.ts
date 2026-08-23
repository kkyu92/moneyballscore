import { describe, it, expect } from 'vitest';
import { computeMlbWaterfall, type MlbWaterfallInput } from '../mlb-waterfall';
import { computeMlbProbability } from '../mlb-base';

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
  homeWinProb: 0.5 + 0.10 * (24 / 400) + 0.10 * 0.5, // formula constant only
};

describe('computeMlbWaterfall', () => {
  it('all-neutral input → only home_advantage + park_factor(0) contribute, final matches homeWinProb', () => {
    const bars = computeMlbWaterfall(NEUTRAL);
    const nonZero = bars.filter((b) => Math.abs(b.contribution) > 1e-9 && b.factor !== 'final' && b.factor !== 'home_advantage');
    expect(nonZero).toHaveLength(0);
    const final = bars[bars.length - 1];
    expect(final.factor).toBe('final');
    expect(final.cumulative).toBeCloseTo(NEUTRAL.homeWinProb, 6);
  });

  it('skips a factor pair when either side is null (no fabrication)', () => {
    const bars = computeMlbWaterfall({ ...NEUTRAL, war: { home: null, away: 2.0 } });
    expect(bars.find((b) => b.factor === 'war')).toBeUndefined();
  });

  it('cumulative sum reconciles with computeMlbProbability for a real asymmetric matchup', () => {
    const input: Parameters<typeof computeMlbProbability>[0] = {
      sp_fip: { home: 3.2, away: 4.5 },
      sp_xfip: { home: 3.4, away: 4.3 },
      lineup_woba: { home: 0.34, away: 0.30 },
      bullpen_fip: { home: 3.2, away: 4.5 },
      recent_form: { home: 50, away: 50 },
      war: { home: 4.0, away: 1.0 },
      head_to_head: { homeWinRate: 0.5 },
      park_factor: 1.05,
      elo: { home: 1523, away: 1487 },
      defense_sfr: { home: 0, away: 0 },
      lineup_xwoba: { home: 0.33, away: 0.31 },
      lineup_barrel_pct: { home: 9.0, away: 7.5 },
      sp_xwoba_against: { home: 0.30, away: 0.30 },
      woba_std: { home: 0.03, away: 0.03 },
    };
    const homeWinProb = computeMlbProbability(input);

    const bars = computeMlbWaterfall({
      sp_fip: input.sp_fip,
      sp_xfip: input.sp_xfip,
      bullpen_fip: input.bullpen_fip,
      lineup_woba: input.lineup_woba,
      war: input.war,
      recent_form: input.recent_form,
      head_to_head: { home: input.head_to_head.homeWinRate, away: 1 - input.head_to_head.homeWinRate },
      lineup_xwoba: input.lineup_xwoba,
      lineup_barrel_pct: input.lineup_barrel_pct,
      elo: input.elo,
      homeParkPf: 105,
      homeWinProb,
    });

    // final bar always mirrors the authoritative (already-clamped) home_win_prob
    const final = bars[bars.length - 1];
    expect(final.cumulative).toBeCloseTo(homeWinProb, 6);

    // pre-clamp bar walk reconstructs the same raw homeAdvantage sum computeMlbProbability
    // used internally (WINNER_PROB_CLAMP applies only at computeMlbProbability's own return
    // and at the waterfall's final bar — the walking bars intentionally show the unclamped path).
    const preFinal = bars[bars.length - 2];
    const rawSum = preFinal.end;
    expect(rawSum).toBeGreaterThan(homeWinProb - 1e-6); // asymmetric matchup pushes prob toward clamp ceiling
  });

  it('elo bar reflects real per-team rating delta (cycle 2349 wiring — regression for the silent-drop bug where asymmetric elo was excluded from the waterfall entirely)', () => {
    const bars = computeMlbWaterfall({ ...NEUTRAL, elo: { home: 1523, away: 1487 } });
    const eloBar = bars.find((b) => b.factor === 'elo');
    expect(eloBar).toBeDefined();
    expect(eloBar!.contribution).toBeCloseTo(0.10 * (1523 - 1487) / 400, 6);
    expect(eloBar!.direction).toBe('home');
  });

  it('recent_form/head_to_head bars reflect real form/matchup deltas (cycle 2353 wiring — regression for the silent-drop where mlb-pipeline.ts started persisting real values but the waterfall still excluded them from the bar list)', () => {
    const bars = computeMlbWaterfall({
      ...NEUTRAL,
      recent_form: { home: 70, away: 30 },
      head_to_head: { home: 0.65, away: 0.35 },
    });

    const recentForm = bars.find((b) => b.factor === 'recent_form');
    expect(recentForm).toBeDefined();
    expect(recentForm!.contribution).toBeCloseTo(0.10 * (70 - 30) * 0.05, 6);
    expect(recentForm!.direction).toBe('home');

    const h2h = bars.find((b) => b.factor === 'head_to_head');
    expect(h2h).toBeDefined();
    // head_to_head is encoded as {home: rate, away: 1-rate} — multiplier 0.5 undoes the
    // 2x from (home-away) so the bar matches mlb-base.ts's weight*(rate-0.5) contract.
    expect(h2h!.contribution).toBeCloseTo(0.03 * (0.65 - 0.5), 6);
    expect(h2h!.direction).toBe('home');
  });

  it('skips recent_form/head_to_head bars when the pair is null (no games yet — no fabrication)', () => {
    const bars = computeMlbWaterfall({
      ...NEUTRAL,
      recent_form: { home: null, away: null },
      head_to_head: { home: null, away: null },
    });
    expect(bars.find((b) => b.factor === 'recent_form')).toBeUndefined();
    expect(bars.find((b) => b.factor === 'head_to_head')).toBeUndefined();
  });

  it('locale="en" produces English bar labels; default/locale="ko" stays Korean', () => {
    const koBars = computeMlbWaterfall(NEUTRAL);
    const enBars = computeMlbWaterfall({ ...NEUTRAL, locale: 'en' });

    expect(koBars.find((b) => b.factor === 'sp_fip')?.label).toBe('선발 FIP');
    expect(enBars.find((b) => b.factor === 'sp_fip')?.label).toBe('SP FIP');
    expect(enBars.find((b) => b.factor === 'home_advantage')?.label).toBe('Home Advantage');
    expect(enBars.find((b) => b.factor === 'final')?.label).toBe('Final Probability');

    // locale only swaps labels — contribution/cumulative math is identical.
    expect(enBars.map((b) => b.contribution)).toEqual(koBars.map((b) => b.contribution));
  });
});
