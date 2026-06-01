import { describe, it, expect } from 'vitest';
import {
  CSV_HEADER,
  HOME_ADVANTAGE,
  REQUIRED_FACTORS,
  buildCsvRow,
  deriveHomeWinProb,
  deriveHomeWon,
  extractFactors,
  type PredictionExportRow,
} from '@/lib/tabpfn-export';

const completeFactors: Record<string, number> = {
  sp_fip: 0.55,
  sp_xfip: 0.52,
  lineup_woba: 0.48,
  bullpen_fip: 0.60,
  recent_form: 0.62,
  war: 0.51,
  head_to_head: 0.50,
  park_factor: 0.49,
  elo: 0.58,
  sfr: 0.47,
};

function baseRow(overrides: Partial<PredictionExportRow> = {}): PredictionExportRow {
  return {
    game_id: 12345,
    predicted_winner: 1,
    confidence: 0.62,
    prediction_type: 'pre_game',
    scoring_rule: 'v1.8',
    factors: { ...completeFactors },
    reasoning: { homeWinProb: 0.58 },
    is_correct: true,
    games: {
      id: 12345,
      game_date: '2026-05-15',
      home_team_id: 1,
      winner_team_id: 1,
      status: 'final',
    },
    ...overrides,
  };
}

describe('CSV_HEADER', () => {
  it('lists 18 columns in spec order', () => {
    expect(CSV_HEADER.split(',')).toEqual([
      'game_id',
      'game_date',
      'prediction_type',
      'scoring_rule',
      ...REQUIRED_FACTORS,
      'home_advantage',
      'predicted_home_win_prob',
      'home_won',
      'is_correct',
    ]);
  });
});

describe('extractFactors', () => {
  it('returns numeric record when all 10 keys exist', () => {
    const out = extractFactors({ ...completeFactors });
    expect(out).toEqual({ ok: true, factors: completeFactors });
  });

  it('drops when factors null', () => {
    expect(extractFactors(null)).toEqual({ ok: false, reason: 'no_factors' });
  });

  it('drops when a key missing', () => {
    const { elo: _omit, ...partial } = completeFactors;
    void _omit;
    expect(extractFactors(partial)).toEqual({
      ok: false,
      reason: 'missing_factor_key',
    });
  });

  it('drops when a value not finite', () => {
    expect(extractFactors({ ...completeFactors, elo: 'NaN' })).toEqual({
      ok: false,
      reason: 'invalid_factor_value',
    });
  });

  it('coerces stringified numbers (supabase JSONB float)', () => {
    const stringified = Object.fromEntries(
      Object.entries(completeFactors).map(([k, v]) => [k, String(v)]),
    );
    expect(extractFactors(stringified)).toEqual({ ok: true, factors: completeFactors });
  });
});

describe('deriveHomeWinProb', () => {
  it('prefers reasoning.homeWinProb when finite in [0,1]', () => {
    expect(deriveHomeWinProb(baseRow({ reasoning: { homeWinProb: 0.73 } }))).toBe(0.73);
  });

  it('falls back to confidence when predicted_winner == home_team_id', () => {
    expect(
      deriveHomeWinProb(
        baseRow({
          reasoning: null,
          predicted_winner: 1,
          confidence: 0.71,
        }),
      ),
    ).toBe(0.71);
  });

  it('inverts confidence when predicted_winner != home_team_id', () => {
    expect(
      deriveHomeWinProb(
        baseRow({
          reasoning: null,
          predicted_winner: 2,
          confidence: 0.71,
        }),
      ),
    ).toBeCloseTo(0.29, 10);
  });

  it('returns null when reasoning invalid + confidence missing', () => {
    expect(
      deriveHomeWinProb(baseRow({ reasoning: { homeWinProb: 1.7 }, confidence: null })),
    ).toBeNull();
  });

  it('rejects out-of-range reasoning value but recovers via confidence', () => {
    expect(
      deriveHomeWinProb(
        baseRow({
          reasoning: { homeWinProb: 1.7 },
          predicted_winner: 1,
          confidence: 0.55,
        }),
      ),
    ).toBe(0.55);
  });
});

describe('deriveHomeWon', () => {
  it('1 when winner is home team', () => {
    expect(deriveHomeWon(baseRow())).toBe(1);
  });

  it('0 when winner is away team', () => {
    expect(
      deriveHomeWon(
        baseRow({
          games: {
            id: 12345,
            game_date: '2026-05-15',
            home_team_id: 1,
            winner_team_id: 2,
            status: 'final',
          },
        }),
      ),
    ).toBe(0);
  });

  it('null when winner_team_id missing', () => {
    expect(
      deriveHomeWon(
        baseRow({
          games: {
            id: 12345,
            game_date: '2026-05-15',
            home_team_id: 1,
            winner_team_id: null,
            status: 'final',
          },
        }),
      ),
    ).toBeNull();
  });
});

describe('buildCsvRow', () => {
  it('emits CSV line with 18 cells matching header order', () => {
    const result = buildCsvRow(baseRow());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cells = result.line.split(',');
    expect(cells).toHaveLength(CSV_HEADER.split(',').length);
    expect(cells[0]).toBe('12345');
    expect(cells[1]).toBe('2026-05-15');
    expect(cells[2]).toBe('pre_game');
    expect(cells[3]).toBe('v1.8');
    expect(Number(cells[4])).toBeCloseTo(completeFactors.sp_fip, 10);
    expect(Number(cells[14])).toBeCloseTo(HOME_ADVANTAGE, 10);
    expect(Number(cells[15])).toBeCloseTo(0.58, 10);
    expect(cells[16]).toBe('1');
    expect(cells[17]).toBe('1');
  });

  it('drops row when games join missing', () => {
    expect(buildCsvRow(baseRow({ games: null }))).toEqual({
      ok: false,
      reason: 'no_games_join',
    });
  });

  it('drops row when is_correct null', () => {
    expect(buildCsvRow(baseRow({ is_correct: null }))).toEqual({
      ok: false,
      reason: 'is_correct_null',
    });
  });

  it('drops row when factor key missing', () => {
    const { elo: _omit, ...partial } = completeFactors;
    void _omit;
    expect(buildCsvRow(baseRow({ factors: partial }))).toEqual({
      ok: false,
      reason: 'missing_factor_key',
    });
  });

  it('drops row when both reasoning + confidence unusable', () => {
    expect(
      buildCsvRow(
        baseRow({ reasoning: null, confidence: null, predicted_winner: null }),
      ),
    ).toEqual({ ok: false, reason: 'no_home_win_prob' });
  });

  it('drops row when winner_team_id null', () => {
    expect(
      buildCsvRow(
        baseRow({
          games: {
            id: 12345,
            game_date: '2026-05-15',
            home_team_id: 1,
            winner_team_id: null,
            status: 'final',
          },
        }),
      ),
    ).toEqual({ ok: false, reason: 'no_winner_team_id' });
  });

  it('emits is_correct=0 when prediction was wrong', () => {
    const result = buildCsvRow(baseRow({ is_correct: false }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.line.split(',').at(-1)).toBe('0');
  });
});
