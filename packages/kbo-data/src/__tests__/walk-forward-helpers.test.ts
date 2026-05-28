import { describe, it, expect } from 'vitest';
import {
  walkForwardSplit,
  scoringRuleSplit,
  rollingTimeCV,
} from '../backtest/walk-forward-helpers';
import type { BacktestPredictionRow } from '../backtest/backtest-v2-helpers';

function makeRow(
  gameId: number,
  date: string,
  scoringRule: string = 'v1.8',
): BacktestPredictionRow {
  return {
    game_id: gameId,
    scoring_rule: scoringRule,
    factors: {},
    games: {
      game_date: date,
      status: 'final',
      home_team_id: 1,
      away_team_id: 2,
      winner_team_id: 1,
    },
  };
}

describe('walkForwardSplit', () => {
  it('rule_definition_date 기준 train/test 분리', () => {
    const rows = [
      makeRow(1, '2026-05-10'),
      makeRow(2, '2026-05-11'),
      makeRow(3, '2026-05-12'),
      makeRow(4, '2026-05-13'),
      makeRow(5, '2026-05-14'),
    ];
    const r = walkForwardSplit(rows, '2026-05-12');
    expect(r.train.length).toBe(2);
    expect(r.test.length).toBe(3);
    expect(r.pattern).toBe('walk-forward');
  });

  it('빈 cohort → train=0 test=0', () => {
    const r = walkForwardSplit([], '2026-05-12');
    expect(r.train.length).toBe(0);
    expect(r.test.length).toBe(0);
  });

  it('game_date 누락 row → skip', () => {
    const rows: BacktestPredictionRow[] = [
      makeRow(1, '2026-05-13'),
      { game_id: 2, scoring_rule: 'v1.8', factors: {}, games: null },
    ];
    const r = walkForwardSplit(rows, '2026-05-12');
    expect(r.train.length + r.test.length).toBe(1);
  });
});

describe('scoringRuleSplit', () => {
  it('scoring_rule 기준 train/test 분리', () => {
    const rows = [
      makeRow(1, '2026-05-10', 'v1.7-revert'),
      makeRow(2, '2026-05-11', 'v1.7-revert'),
      makeRow(3, '2026-05-13', 'v1.8'),
      makeRow(4, '2026-05-14', 'v1.8'),
    ];
    const r = scoringRuleSplit(rows, ['v1.7-revert'], ['v1.8']);
    expect(r.train.length).toBe(2);
    expect(r.test.length).toBe(2);
    expect(r.pattern).toBe('v18-only-rescore');
  });

  it('다중 train scoring_rule', () => {
    const rows = [
      makeRow(1, '2026-04-01', 'v1.5'),
      makeRow(2, '2026-04-15', 'v1.6'),
      makeRow(3, '2026-04-20', 'v1.7-revert'),
      makeRow(4, '2026-05-13', 'v1.8'),
    ];
    const r = scoringRuleSplit(rows, ['v1.5', 'v1.6', 'v1.7-revert'], ['v1.8']);
    expect(r.train.length).toBe(3);
    expect(r.test.length).toBe(1);
  });

  it('train/test 어디에도 안 맞는 scoring_rule → skip', () => {
    const rows = [
      makeRow(1, '2026-04-01', 'v1.5'),
      makeRow(2, '2026-05-13', 'v2.1-B-shadow'),
    ];
    const r = scoringRuleSplit(rows, ['v1.7-revert'], ['v1.8']);
    expect(r.train.length).toBe(0);
    expect(r.test.length).toBe(0);
  });
});

describe('rollingTimeCV', () => {
  it('window 안 train/test 7:3 비율', () => {
    const rows = [
      makeRow(1, '2026-05-01'),
      makeRow(2, '2026-05-05'),
      makeRow(3, '2026-05-10'),
      makeRow(4, '2026-05-15'),
      makeRow(5, '2026-05-20'),
      makeRow(6, '2026-05-25'),
      makeRow(7, '2026-05-28'),
      makeRow(8, '2026-05-29'),
      makeRow(9, '2026-05-30'),
      makeRow(10, '2026-05-30'),
    ];
    const r = rollingTimeCV(rows, 30, 0.7);
    expect(r.train.length + r.test.length).toBe(10);
    expect(r.train.length).toBe(7);
    expect(r.test.length).toBe(3);
    expect(r.pattern).toBe('rolling');
  });

  it('빈 cohort → train=0 test=0', () => {
    const r = rollingTimeCV([], 30, 0.7);
    expect(r.train.length).toBe(0);
    expect(r.test.length).toBe(0);
  });

  it('windowDays 작음 → cohort 일부만 selected', () => {
    const rows = [
      makeRow(1, '2026-05-01'),
      makeRow(2, '2026-05-15'),
      makeRow(3, '2026-05-28'),
      makeRow(4, '2026-05-30'),
    ];
    // windowDays=5 → 5/25~5/30 만 window 안 (last=5/30 - 5 = 5/25)
    const r = rollingTimeCV(rows, 5, 0.5);
    expect(r.train.length + r.test.length).toBe(2); // 5/28 + 5/30
  });
});
