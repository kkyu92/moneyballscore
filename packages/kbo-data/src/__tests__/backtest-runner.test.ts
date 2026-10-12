import { describe, it, expect } from 'vitest';
import { runBacktest } from '../backtest/runner';
import type { BacktestGame, GameFeatures, Model } from '../backtest/types';
import type { EloHistory } from '../backtest/elo-history';

const HOME_ID = 1;
const AWAY_ID = 2;

function game(date: string, homeWon: boolean): BacktestGame {
  return {
    date,
    season: 2026,
    homeTeam: 'LG',
    awayTeam: 'HT',
    homeTeamId: HOME_ID,
    awayTeamId: AWAY_ID,
    homeScore: homeWon ? 5 : 3,
    awayScore: homeWon ? 3 : 5,
    homeWon,
  };
}

function eloHistory(): EloHistory {
  return new Map([
    ['LG', [{ date: '2026-01-01', elo: 1500 }]],
    ['HT', [{ date: '2026-01-01', elo: 1500 }]],
  ]);
}

describe('runBacktest — same-date batch (doubleheader) look-ahead guard', () => {
  it('does not leak same-day game results into h2h/form features of later games on that date', () => {
    const captured: GameFeatures[] = [];
    const probe: Model = (f) => {
      captured.push(f);
      return 0.5;
    };

    // 더블헤더: 같은 두 팀이 같은 날 2경기. g1 결과가 g2의 h2h/form 계산에
    // 누출되면 안 됨 — 두 경기 모두 "그 날짜 이전" prior (비어 있음) 으로만
    // feature 가 구성돼야 한다.
    const games: BacktestGame[] = [
      game('2026-05-01', true),
      game('2026-05-01', false),
    ];

    runBacktest({ games, eloHistory: eloHistory(), models: { probe } });

    expect(captured).toHaveLength(2);
    for (const f of captured) {
      expect(f.h2hHomeWins).toBe(0);
      expect(f.h2hAwayWins).toBe(0);
    }
  });

  it('later-date games still see earlier-date results as prior', () => {
    const captured: GameFeatures[] = [];
    const probe: Model = (f) => {
      captured.push(f);
      return 0.5;
    };

    const games: BacktestGame[] = [
      game('2026-05-01', true), // home wins g1
      game('2026-05-02', true), // next day — should see g1 as prior
    ];

    runBacktest({ games, eloHistory: eloHistory(), models: { probe } });

    expect(captured).toHaveLength(2);
    expect(captured[0].h2hHomeWins).toBe(0);
    expect(captured[1].h2hHomeWins).toBe(1);
  });
});
