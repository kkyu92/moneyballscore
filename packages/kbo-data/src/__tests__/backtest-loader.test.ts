import { describe, it, expect } from 'vitest';
import { buildFeatures, computeHomeWinRates } from '../backtest/loader';
import type { BacktestGame } from '../backtest/types';
import type { EloHistory } from '../backtest/elo-history';
import type { SeasonStatsMap } from '../backtest/wayback-team-stats';
import type { GameRecordLite } from '../features/game-record-features';

const HOME_ID = 1;
const AWAY_ID = 2;

function target(): BacktestGame {
  return {
    date: '2026-05-10',
    season: 2026,
    homeTeam: 'LG',
    awayTeam: 'HT',
    homeTeamId: HOME_ID,
    awayTeamId: AWAY_ID,
    homeScore: 5,
    awayScore: 3,
    homeWon: true,
  };
}

function eloHistory(): EloHistory {
  return new Map([
    ['LG', [{ date: '2026-01-01', elo: 1500 }]],
    ['HT', [{ date: '2026-01-01', elo: 1480 }]],
  ]);
}

describe('buildFeatures — seasonStats (Wayback) branch', () => {
  it('leaves woba/fip/sfr undefined when seasonStats is omitted', () => {
    const f = buildFeatures(target(), [], eloHistory());
    expect(f).not.toBeNull();
    expect(f!.homeWoba).toBeUndefined();
    expect(f!.awayFip).toBeUndefined();
    expect(f!.homeSfr).toBeUndefined();
  });

  it('populates woba/fip/sfr for both teams when seasonStats has entries for them', () => {
    const seasonStats: SeasonStatsMap = new Map([
      ['LG', { woba: 0.355, fip: 3.9, sfr: 1.2 }],
      ['HT', { woba: 0.33, fip: 4.3, sfr: 0.8 }],
    ]);

    const f = buildFeatures(target(), [], eloHistory(), seasonStats);
    expect(f).not.toBeNull();
    expect(f!.homeWoba).toBe(0.355);
    expect(f!.homeFip).toBe(3.9);
    expect(f!.homeSfr).toBe(1.2);
    expect(f!.awayWoba).toBe(0.33);
    expect(f!.awayFip).toBe(4.3);
    expect(f!.awaySfr).toBe(0.8);
  });

  it('leaves only the missing team undefined when seasonStats covers one side only', () => {
    const seasonStats: SeasonStatsMap = new Map([['LG', { woba: 0.355, fip: 3.9, sfr: 1.2 }]]);

    const f = buildFeatures(target(), [], eloHistory(), seasonStats);
    expect(f).not.toBeNull();
    expect(f!.homeWoba).toBe(0.355);
    expect(f!.awayWoba).toBeUndefined();
    expect(f!.awayFip).toBeUndefined();
  });
});

describe('buildFeatures — priorRecords (game_records) branch', () => {
  function record(gameDate: string, homeScore: number, awayScore: number): GameRecordLite {
    return {
      gameId: Math.floor(Math.random() * 1e6),
      gameDate,
      homeTeamId: HOME_ID,
      awayTeamId: AWAY_ID,
      homeScore,
      awayScore,
      pitchersHome: [],
      pitchersAway: [],
    };
  }

  it('leaves L3/L5 fields undefined when priorRecords is omitted', () => {
    const f = buildFeatures(target(), [], eloHistory());
    expect(f).not.toBeNull();
    expect(f!.homeBullpenInningsL3).toBeUndefined();
    expect(f!.homeRunsL5).toBeUndefined();
    expect(f!.awayHomeRunsL5).toBeUndefined();
  });

  it('leaves L3/L5 fields undefined when priorRecords is an empty array', () => {
    const f = buildFeatures(target(), [], eloHistory(), undefined, []);
    expect(f).not.toBeNull();
    expect(f!.homeRunsL5).toBeUndefined();
    expect(f!.homeBullpenInningsL3).toBeUndefined();
  });

  it('populates L5 runs/runsAllowed from prior records strictly before target.date', () => {
    const priorRecords: GameRecordLite[] = [
      record('2026-05-08', 5, 2), // home(LG) scored 5, allowed 2
      record('2026-05-09', 3, 1), // home(LG) scored 3, allowed 1
      record('2026-05-10', 9, 9), // same date as target — must NOT leak in (< target.date)
    ];

    const f = buildFeatures(target(), [], eloHistory(), undefined, priorRecords);
    expect(f).not.toBeNull();
    // only the two prior-date records count; same-date record excluded
    expect(f!.homeRunsL5).toBeCloseTo((5 + 3) / 2);
    expect(f!.homeRunsAllowedL5).toBeCloseTo((2 + 1) / 2);
    expect(f!.awayRunsL5).toBeCloseTo((2 + 1) / 2);
    expect(f!.awayRunsAllowedL5).toBeCloseTo((5 + 3) / 2);
  });
});

describe('computeHomeWinRates', () => {
  it('computes per-team home win rate across provided games', () => {
    const games: BacktestGame[] = [
      { ...target(), date: '2026-05-01', homeWon: true },
      { ...target(), date: '2026-05-02', homeWon: false },
      { ...target(), date: '2026-05-03', homeWon: true },
    ];
    const rates = computeHomeWinRates(games);
    expect(rates.LG).toBeCloseTo(2 / 3);
  });
});
