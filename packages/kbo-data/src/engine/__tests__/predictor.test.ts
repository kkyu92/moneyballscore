import { describe, it, expect } from 'vitest';
import { predict } from '../predictor';
import type { PredictionInput, PitcherStats, TeamStats, EloRating, ScrapedGame } from '../../types';

function game(): ScrapedGame {
  return {
    date: '2026-10-07',
    homeTeam: 'SK',
    awayTeam: 'HT',
    gameTime: '18:30',
    stadium: '인천SSG랜더스필드',
    status: 'scheduled',
    externalGameId: 'test-1',
  };
}

function pitcher(overrides: Partial<PitcherStats> = {}): PitcherStats {
  return {
    name: 'test',
    team: 'SK',
    fip: 3.5,
    xfip: 3.6,
    era: 3.4,
    innings: 100,
    war: 2.0,
    kPer9: 8.0,
    ...overrides,
  };
}

function teamStats(overrides: Partial<TeamStats> = {}): TeamStats {
  return {
    team: 'SK',
    woba: 0.33,
    bullpenFip: 4.0,
    totalWar: 10,
    sfr: 2,
    ...overrides,
  };
}

function elo(value: number): EloRating {
  return { team: 'SK', elo: value, winPct: 0.5 };
}

function baseInput(overrides: Partial<PredictionInput> = {}): PredictionInput {
  return {
    game: game(),
    homeSPStats: pitcher(),
    awaySPStats: pitcher(),
    homeTeamStats: teamStats(),
    awayTeamStats: teamStats(),
    homeElo: elo(1500),
    awayElo: elo(1500),
    headToHead: { wins: 0, losses: 0 },
    homeRecentForm: 0.5,
    awayRecentForm: 0.5,
    parkFactor: 1.0,
    ...overrides,
  };
}

describe('predictor NaN-cascade guard (cycle 2980)', () => {
  it('NaN sp_fip on one side does not cascade homeWinProb to NaN', () => {
    const input = baseInput({
      homeSPStats: pitcher({ fip: NaN }),
      awaySPStats: pitcher({ fip: 4.0 }),
    });
    const result = predict(input);
    expect(Number.isFinite(result.homeWinProb)).toBe(true);
  });

  it('NaN sp_fip is neutral (same result as sp_fip being equal), not biased toward home', () => {
    const withNaN = predict(
      baseInput({
        homeSPStats: pitcher({ fip: NaN }),
        awaySPStats: pitcher({ fip: 4.0 }),
      }),
    );
    const equalFip = predict(
      baseInput({
        homeSPStats: pitcher({ fip: 3.5 }),
        awaySPStats: pitcher({ fip: 3.5 }),
      }),
    );
    expect(withNaN.homeWinProb).toBeCloseTo(equalFip.homeWinProb, 6);
  });

  it('NaN defense_sfr on one side does not cascade to NaN homeWinProb', () => {
    const input = baseInput({
      homeTeamStats: teamStats({ sfr: NaN }),
      awayTeamStats: teamStats({ sfr: 5 }),
    });
    const result = predict(input);
    expect(Number.isFinite(result.homeWinProb)).toBe(true);
  });
});
