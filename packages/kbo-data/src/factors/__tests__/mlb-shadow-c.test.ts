import { describe, it, expect } from 'vitest';
import {
  trainShadowWeights,
  computeBrier,
  MILESTONE_TRIGGERS,
  walkForwardExpanding,
  type TrainingSample,
} from '../mlb-shadow-c';

describe('mlb-shadow-c.MILESTONE_TRIGGERS', () => {
  it('milestone array = [27, 60, 150, 300, 1000, 2430] KBO 정합', () => {
    expect(MILESTONE_TRIGGERS).toEqual([27, 60, 150, 300, 1000, 2430]);
  });
});

describe('mlb-shadow-c.computeBrier', () => {
  it('Brier score = mean((predicted - actual)^2)', () => {
    const predictions = [
      { predicted: 0.7, actual: 1 as 0 | 1 },
      { predicted: 0.3, actual: 0 as 0 | 1 },
      { predicted: 0.5, actual: 1 as 0 | 1 },
    ];
    const brier = computeBrier(predictions);
    expect(brier).toBeCloseTo((0.09 + 0.09 + 0.25) / 3, 4);
  });

  it('empty array returns 0', () => {
    expect(computeBrier([])).toBe(0);
  });
});

describe('mlb-shadow-c.trainShadowWeights', () => {
  it('trains weights from sample cohort', () => {
    const samples: TrainingSample[] = Array.from({ length: 30 }, (_, i) => ({
      factors: {
        sp_fip_delta: (i % 5) * 0.1 - 0.2,
        lineup_woba_delta: (i % 3) * 0.02 - 0.02,
      },
      homeWon: (i % 2 === 0 ? 1 : 0) as 0 | 1,
    }));

    const { weights, brier, accuracy } = trainShadowWeights(samples);
    expect(Object.keys(weights).length).toBeGreaterThan(0);
    expect(brier).toBeGreaterThan(0);
    expect(brier).toBeLessThan(1);
    expect(accuracy).toBeGreaterThanOrEqual(0);
    expect(accuracy).toBeLessThanOrEqual(1);
  });

  it('empty samples returns zero weights', () => {
    const result = trainShadowWeights([]);
    expect(result.weights).toEqual({});
    expect(result.brier).toBe(0);
    expect(result.accuracy).toBe(0);
  });
});

describe('mlb-shadow-c.walkForwardExpanding', () => {
  it('returns brier per month boundary', () => {
    const samples: TrainingSample[] = Array.from({ length: 60 }, (_, i) => ({
      factors: { f: i * 0.01 },
      homeWon: (i % 2) as 0 | 1,
    }));
    const results = walkForwardExpanding(samples, [10, 30, 60]);
    expect(results.length).toBe(3);
    expect(results[0]).toMatchObject({ month: 0, cohortSize: 10 });
  });

  it('skips months with cohort < 10', () => {
    const samples: TrainingSample[] = Array.from({ length: 5 }, (_, i) => ({
      factors: { f: i * 0.01 },
      homeWon: (i % 2) as 0 | 1,
    }));
    const results = walkForwardExpanding(samples, [5]);
    expect(results).toEqual([]);
  });
});
