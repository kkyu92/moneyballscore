import { describe, it, expect } from 'vitest';
import {
  computeProb,
  brierScore,
  accuracyHit,
  evaluatePair,
  evaluateFancyElo,
  computeEloProb,
  formatBacktestMarkdown,
  type BacktestPredictionRow,
  type TeamEloMap,
} from '../backtest/backtest-v2-helpers';
import { DEFAULT_WEIGHTS, SHADOW_V20_WEIGHTS } from '@moneyball/shared';

const FACTORS_HOME_FAVORED: Record<string, number> = {
  sp_fip: 0.65,
  sp_xfip: 0.6,
  lineup_woba: 0.7,
  bullpen_fip: 0.6,
  recent_form: 0.65,
  war: 0.6,
  head_to_head: 0.55,
  park_factor: 0.5,
  elo: 0.7,
  sfr: 0.5,
};

describe('computeProb', () => {
  it('홈 유리 factors → prob > 0.5', () => {
    const v18 = computeProb(FACTORS_HOME_FAVORED, DEFAULT_WEIGHTS);
    const v20 = computeProb(FACTORS_HOME_FAVORED, SHADOW_V20_WEIGHTS);
    expect(v18).not.toBeNull();
    expect(v20).not.toBeNull();
    expect(v18!).toBeGreaterThan(0.5);
    expect(v20!).toBeGreaterThan(0.5);
  });

  it('missing factor → neutral fallback', () => {
    const partial = { ...FACTORS_HOME_FAVORED };
    delete partial.elo;
    expect(computeProb(partial, SHADOW_V20_WEIGHTS)).not.toBeNull();
  });

  it('clamp [0.15, 0.85]', () => {
    const extreme = Object.fromEntries(Object.keys(SHADOW_V20_WEIGHTS).map((k) => [k, 1]));
    const prob = computeProb(extreme, SHADOW_V20_WEIGHTS);
    expect(prob).toBeLessThanOrEqual(0.85);
    expect(prob).toBeGreaterThanOrEqual(0.15);
  });

  it('factorTotal=0 → null', () => {
    expect(computeProb({}, {})).toBeNull();
  });
});

describe('brierScore', () => {
  it('홈 승 + prob 1.0 → brier 0', () => expect(brierScore(1.0, true)).toBeCloseTo(0, 6));
  it('홈 승 + prob 0.0 → brier 1', () => expect(brierScore(0.0, true)).toBeCloseTo(1, 6));
  it('홈 패 + prob 0.0 → brier 0', () => expect(brierScore(0.0, false)).toBeCloseTo(0, 6));
  it('homeWin neutral 0.5 → brier 0.25', () =>
    expect(brierScore(0.5, true)).toBeCloseTo(0.25, 6));
});

describe('accuracyHit', () => {
  it('prob > 0.5 + 홈 승 → hit', () => expect(accuracyHit(0.6, true)).toBe(true));
  it('prob < 0.5 + 홈 패 → hit', () => expect(accuracyHit(0.4, false)).toBe(true));
  it('prob > 0.5 + 홈 패 → miss', () => expect(accuracyHit(0.6, false)).toBe(false));
});

describe('evaluatePair', () => {
  const makeRow = (
    gameId: number,
    factors: Record<string, number>,
    homeWin: boolean,
  ): BacktestPredictionRow => ({
    game_id: gameId,
    scoring_rule: 'v1.8',
    factors,
    games: {
      game_date: '2026-05-20',
      status: 'final',
      home_team_id: 1,
      winner_team_id: homeWin ? 1 : 2,
    },
  });

  it('빈 cohort → n=0 + warning 소표본', () => {
    const r = evaluatePair([]);
    expect(r.cohort_n).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('완료 3건 → n=3 + degenerate warning', () => {
    const r = evaluatePair([
      makeRow(1, FACTORS_HOME_FAVORED, true),
      makeRow(2, FACTORS_HOME_FAVORED, false),
      makeRow(3, FACTORS_HOME_FAVORED, true),
    ]);
    expect(r.cohort_n).toBe(3);
    expect(r.walk_forward_status).toBe('degenerate');
    expect(r.warnings.some((w) => w.includes('walk-forward'))).toBe(true);
  });

  it('미완료 game → cohort 제외', () => {
    const rows: BacktestPredictionRow[] = [
      makeRow(1, FACTORS_HOME_FAVORED, true),
      {
        game_id: 2,
        scoring_rule: 'v1.8',
        factors: FACTORS_HOME_FAVORED,
        games: {
          game_date: '2026-05-20',
          status: 'scheduled',
          home_team_id: 1,
          winner_team_id: null,
        },
      },
    ];
    expect(evaluatePair(rows).cohort_n).toBe(1);
  });

  it('factors null → 제외', () => {
    const rows: BacktestPredictionRow[] = [
      makeRow(1, FACTORS_HOME_FAVORED, true),
      {
        game_id: 2,
        scoring_rule: 'v1.8',
        factors: null,
        games: {
          game_date: '2026-05-20',
          status: 'final',
          home_team_id: 1,
          winner_team_id: 1,
        },
      },
    ];
    expect(evaluatePair(rows).cohort_n).toBe(1);
  });

  it('Brier delta + accuracy delta 측정', () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow(i + 1, FACTORS_HOME_FAVORED, i % 2 === 0),
    );
    const r = evaluatePair(rows);
    expect(r.cohort_n).toBe(5);
    expect(typeof r.brier_delta).toBe('number');
    expect(typeof r.accuracy_delta).toBe('number');
  });

  it('n < 150 시 소표본 warning', () => {
    const rows = Array.from({ length: 50 }, (_, i) =>
      makeRow(i + 1, FACTORS_HOME_FAVORED, i % 2 === 0),
    );
    expect(evaluatePair(rows).warnings.some((w) => w.includes('소표본'))).toBe(true);
  });

  it('Fancy Stats Elo column TODO 표기', () => {
    const r = evaluatePair([]);
    expect(r.fancy_stats_elo_brier).toBeNull();
    expect(r.fancy_stats_elo_note).toContain('carry-over');
  });
});

describe('computeEloProb', () => {
  it('같은 Elo + home adj → home prob > 0.5 (HOME_ADVANTAGE 양수)', () => {
    const p = computeEloProb(1500, 1500);
    expect(p).toBeGreaterThan(0.5);
  });

  it('home Elo 200 점 높음 → home prob > 0.7', () => {
    const p = computeEloProb(1600, 1400);
    expect(p).toBeGreaterThan(0.7);
  });

  it('away Elo 200 점 높음 → home prob < 0.3', () => {
    const p = computeEloProb(1400, 1600);
    expect(p).toBeLessThan(0.3);
  });

  it('return ∈ (0, 1)', () => {
    const p = computeEloProb(1500, 1500);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe('evaluateFancyElo', () => {
  const makeRowWithAway = (
    gameId: number,
    homeWin: boolean,
    status: string = 'final',
  ): BacktestPredictionRow => ({
    game_id: gameId,
    scoring_rule: 'v1.8',
    factors: {},
    games: {
      game_date: '2026-05-20',
      status,
      home_team_id: 1,
      away_team_id: 2,
      winner_team_id: status === 'final' ? (homeWin ? 1 : 2) : null,
    },
  });

  it('teamElos empty → brier=null', () => {
    const r = evaluateFancyElo([makeRowWithAway(1, true)], new Map());
    expect(r.brier).toBeNull();
    expect(r.n).toBe(0);
  });

  it('teamElos 매핑 정상 → brier 측정 + n > 0', () => {
    const teamElos: TeamEloMap = new Map([
      [1, 1600],
      [2, 1400],
    ]);
    const rows = [
      makeRowWithAway(1, true),
      makeRowWithAway(2, true),
      makeRowWithAway(3, false),
    ];
    const r = evaluateFancyElo(rows, teamElos);
    expect(r.n).toBe(3);
    expect(r.brier).not.toBeNull();
    expect(r.brier!).toBeGreaterThan(0);
    expect(r.brier!).toBeLessThan(1);
  });

  it('미완료 game → cohort 제외', () => {
    const teamElos: TeamEloMap = new Map([[1, 1500], [2, 1500]]);
    const rows = [
      makeRowWithAway(1, true, 'scheduled'),
      makeRowWithAway(2, true, 'final'),
    ];
    const r = evaluateFancyElo(rows, teamElos);
    expect(r.n).toBe(1);
  });

  it('away_team_id 누락 → missing 카운트', () => {
    const teamElos: TeamEloMap = new Map([[1, 1500]]);
    const rows: BacktestPredictionRow[] = [
      {
        game_id: 1,
        scoring_rule: 'v1.8',
        factors: {},
        games: {
          game_date: '2026-05-20',
          status: 'final',
          home_team_id: 1,
          winner_team_id: 1,
          // away_team_id 누락
        },
      },
    ];
    const r = evaluateFancyElo(rows, teamElos);
    expect(r.n).toBe(0);
    expect(r.note).toContain('missing=1');
  });
});

describe('formatBacktestMarkdown', () => {
  it('markdown 안 plan #14 C1b 박제', () => {
    const r = evaluatePair([]);
    const md = formatBacktestMarkdown(r, 1019);
    expect(md).toContain('plan #14 C1b');
    expect(md).toContain('cycle: 1019');
    expect(md).toContain('v1.8 (production)');
    expect(md).toContain('v2.0 후보');
    expect(md).toContain('자가 검증');
  });
});
