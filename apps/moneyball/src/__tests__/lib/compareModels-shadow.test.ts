import { describe, it, expect } from 'vitest';
import {
  buildShadowRows,
  extractPureQuantProb,
  aggregateByModel,
  type PredictionRow,
} from '@/lib/dashboard/compareModels';

describe('extractPureQuantProb', () => {
  it('reads quantitativeHomeWinProb', () => {
    expect(
      extractPureQuantProb({ quantitativeHomeWinProb: 0.56, homeWinProb: 0.62 }),
    ).toBe(0.56);
  });

  it('returns null when field missing', () => {
    expect(extractPureQuantProb({ homeWinProb: 0.6 })).toBeNull();
  });
});

describe('buildShadowRows', () => {
  const base: PredictionRow = {
    id: 1,
    model_version: 'v2.0-debate',
    scoring_rule: 'v1.6',
    is_correct: false,
    verified_at: '2026-04-23',
    created_at: '2026-04-22T10:00:00Z',
    reasoning: {
      homeWinProb: 0.72,
      quantitativeHomeWinProb: 0.56,
      debate: { verdict: { homeWinProb: 0.72 } },
    },
    game: { home_team_id: 1, winner_team_id: 1 },
  };

  it('creates shadow row from v2.0-debate with pure prob', () => {
    const shadow = buildShadowRows([base]);
    expect(shadow).toHaveLength(1);
    expect(shadow[0].model_version).toBe('quant-only-shadow');
    expect(shadow[0].scoring_rule).toBe('v1.6');
    // is_correct: pHome=0.56 >= 0.5 → predict home. winner=home_team → correct
    expect(shadow[0].is_correct).toBe(true);
  });

  it('skips non-debate rows', () => {
    const row: PredictionRow = { ...base, model_version: 'v1.5' };
    expect(buildShadowRows([row])).toHaveLength(0);
  });

  it('skips rows without quantitativeHomeWinProb', () => {
    const row: PredictionRow = {
      ...base,
      reasoning: { homeWinProb: 0.72 },
    };
    expect(buildShadowRows([row])).toHaveLength(0);
  });

  it('shadow groups separately in aggregateByModel', () => {
    const rows: PredictionRow[] = [base];
    const shadow = buildShadowRows(rows);
    const groups = aggregateByModel([...rows, ...shadow]);
    const debate = groups.find((g) => g.modelVersion === 'v2.0-debate');
    const pure = groups.find((g) => g.modelVersion === 'quant-only-shadow');
    expect(debate).toBeDefined();
    expect(pure).toBeDefined();
    // debate Brier: (0.72 - 1)^2 = 0.0784
    expect(debate!.brier).toBeCloseTo(0.0784, 4);
    // pure Brier: (0.56 - 1)^2 = 0.1936
    expect(pure!.brier).toBeCloseTo(0.1936, 4);
  });
});
