import { describe, it, expect } from 'vitest';
import { buildMlbGameOverview } from '../mlb-overview';
import { computeMlbWaterfall, type MlbWaterfallInput } from '../mlb-waterfall';

const HOME = '홈팀';
const AWAY = '원정팀';

describe('buildMlbGameOverview', () => {
  it('all-neutral input → no pitching/batting sentences, situational only has home_advantage (park_factor=0 contribution)', () => {
    const input: MlbWaterfallInput = {
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
    const bars = computeMlbWaterfall(input);
    const overview = buildMlbGameOverview(bars, HOME, AWAY);
    expect(overview.pitching).toHaveLength(0);
    expect(overview.batting).toHaveLength(0);
    // home_advantage 는 팀 무관 고정 상수(HOME_ELO_BONUS)라 neutral 입력에도 항상 non-zero.
    expect(overview.situational).toHaveLength(1);
    expect(overview.situational[0]).toContain('홈 어드밴티지');
    expect(overview.situational[0]).toContain(HOME);
  });

  it('asymmetric matchup → pitching/batting sentences credit the correct team by direction', () => {
    const input: MlbWaterfallInput = {
      sp_fip: { home: 3.2, away: 4.5 }, // home has lower(better) FIP → home favored
      sp_xfip: { home: 3.4, away: 4.3 },
      bullpen_fip: { home: 3.2, away: 4.5 },
      lineup_woba: { home: 0.34, away: 0.30 }, // home higher wOBA → home favored
      war: { home: 4.0, away: 1.0 },
      recent_form: { home: 50, away: 50 },
      head_to_head: { home: 0.5, away: 0.5 },
      lineup_xwoba: { home: 0.33, away: 0.31 },
      lineup_barrel_pct: { home: 9.0, away: 7.5 },
      elo: { home: 1500, away: 1500 },
      homeParkPf: 105,
      homeWinProb: 0.62,
    };
    const bars = computeMlbWaterfall(input);
    const overview = buildMlbGameOverview(bars, HOME, AWAY);

    expect(overview.pitching.length).toBeGreaterThan(0);
    expect(overview.pitching.every((s) => s.includes(HOME))).toBe(true);
    expect(overview.batting.length).toBeGreaterThan(0);
    expect(overview.batting.every((s) => s.includes(HOME))).toBe(true);
    expect(overview.situational.some((s) => s.includes(HOME))).toBe(true);
  });

  it('recent_form/head_to_head land in situational, not pitching/batting (cycle 2353 wiring)', () => {
    const input: MlbWaterfallInput = {
      sp_fip: { home: 4.0, away: 4.0 },
      sp_xfip: { home: 4.0, away: 4.0 },
      bullpen_fip: { home: 4.0, away: 4.0 },
      lineup_woba: { home: 0.32, away: 0.32 },
      war: { home: 2.0, away: 2.0 },
      recent_form: { home: 70, away: 30 },
      head_to_head: { home: 0.65, away: 0.35 },
      lineup_xwoba: { home: 0.32, away: 0.32 },
      lineup_barrel_pct: { home: 8.0, away: 8.0 },
      elo: { home: 1500, away: 1500 },
      homeParkPf: 100,
      homeWinProb: 0.6,
    };
    const bars = computeMlbWaterfall(input);
    const overview = buildMlbGameOverview(bars, HOME, AWAY);
    expect(overview.pitching).toHaveLength(0);
    expect(overview.batting).toHaveLength(0);
    expect(overview.situational.some((s) => s.includes('최근폼'))).toBe(true);
    expect(overview.situational.some((s) => s.includes('상대전적'))).toBe(true);
  });

  it('skips a factor when its bar is absent (null pair upstream)', () => {
    const bars = computeMlbWaterfall({
      sp_fip: { home: 3.2, away: 4.5 },
      sp_xfip: { home: 3.4, away: 4.3 },
      bullpen_fip: { home: 3.2, away: 4.5 },
      lineup_woba: { home: 0.34, away: 0.30 },
      war: { home: null, away: 2.0 }, // war pair missing → bar skipped upstream
      recent_form: { home: 50, away: 50 },
      head_to_head: { home: 0.5, away: 0.5 },
      lineup_xwoba: { home: 0.33, away: 0.31 },
      lineup_barrel_pct: { home: 9.0, away: 7.5 },
      elo: { home: 1500, away: 1500 },
      homeParkPf: 105,
      homeWinProb: 0.6,
    });
    const overview = buildMlbGameOverview(bars, HOME, AWAY);
    expect(overview.batting.some((s) => s.includes('WAR'))).toBe(false);
  });

  it('ignores the final-probability bar (not part of any narrative group)', () => {
    const bars = computeMlbWaterfall({
      sp_fip: { home: 3.2, away: 4.5 },
      sp_xfip: { home: 3.4, away: 4.3 },
      bullpen_fip: { home: 3.2, away: 4.5 },
      lineup_woba: { home: 0.34, away: 0.30 },
      war: { home: 4.0, away: 1.0 },
      recent_form: { home: 50, away: 50 },
      head_to_head: { home: 0.5, away: 0.5 },
      lineup_xwoba: { home: 0.33, away: 0.31 },
      lineup_barrel_pct: { home: 9.0, away: 7.5 },
      elo: { home: 1500, away: 1500 },
      homeParkPf: 105,
      homeWinProb: 0.62,
    });
    const overview = buildMlbGameOverview(bars, HOME, AWAY);
    const allSentences = [...overview.pitching, ...overview.batting, ...overview.situational];
    expect(allSentences.some((s) => s.includes('최종 확률'))).toBe(false);
  });

  it('locale="en" produces English sentences with English bar labels (no Korean leak)', () => {
    const input: MlbWaterfallInput = {
      sp_fip: { home: 3.2, away: 4.5 },
      sp_xfip: { home: 3.4, away: 4.3 },
      bullpen_fip: { home: 3.2, away: 4.5 },
      lineup_woba: { home: 0.34, away: 0.30 },
      war: { home: 4.0, away: 1.0 },
      recent_form: { home: 50, away: 50 },
      head_to_head: { home: 0.5, away: 0.5 },
      lineup_xwoba: { home: 0.33, away: 0.31 },
      lineup_barrel_pct: { home: 9.0, away: 7.5 },
      elo: { home: 1500, away: 1500 },
      homeParkPf: 105,
      homeWinProb: 0.62,
      locale: 'en',
    };
    const bars = computeMlbWaterfall(input);
    const enHome = 'Home Team';
    const enAway = 'Away Team';
    const overview = buildMlbGameOverview(bars, enHome, enAway, 'en');

    expect(overview.pitching.length).toBeGreaterThan(0);
    expect(overview.pitching.every((s) => s.includes(enHome) && s.includes('edge in'))).toBe(true);
    expect(overview.batting.length).toBeGreaterThan(0);
    const allSentences = [...overview.pitching, ...overview.batting, ...overview.situational];
    expect(allSentences.some((s) => /[가-힣]/.test(s))).toBe(false); // no Korean characters leak through
  });
});
