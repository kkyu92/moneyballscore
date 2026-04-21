import { describe, it, expect } from 'vitest';
import { trainLogistic, predict, vectorize } from '../backtest/logistic';
import type { GameFeatures } from '../backtest/types';

describe('trainLogistic', () => {
  it('learns linearly separable 1D data', () => {
    // y=1 when x>0, y=0 when x<0
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 1; i <= 20; i++) {
      X.push([i]);
      y.push(1);
      X.push([-i]);
      y.push(0);
    }
    const model = trainLogistic(X, y, { lambda: 0, lr: 0.1, maxIter: 2000 });
    expect(model.weights[0]).toBeGreaterThan(0.5);
    const preds = predict(model, [[10], [-10], [0.1], [-0.1]]);
    expect(preds[0]).toBeGreaterThan(0.95);
    expect(preds[1]).toBeLessThan(0.05);
    expect(preds[2]).toBeGreaterThan(0.5);
    expect(preds[3]).toBeLessThan(0.5);
  });

  it('learns near-zero weight for uninformative feature', () => {
    // 2 features — only first is informative
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 200; i++) {
      const signal = (i % 2 === 0 ? 1 : -1) * Math.random();
      const noise = (Math.random() - 0.5) * 2;
      X.push([signal, noise]);
      y.push(signal > 0 ? 1 : 0);
    }
    const model = trainLogistic(X, y, { lambda: 0.001, lr: 0.1, maxIter: 3000 });
    // informative feature has larger |weight| than noise
    expect(Math.abs(model.weights[0])).toBeGreaterThan(Math.abs(model.weights[1]));
  });
});

describe('vectorize', () => {
  it('produces 4-feature vector from GameFeatures', () => {
    const f: GameFeatures = {
      homeElo: 1600,
      awayElo: 1500,
      homeForm: 0.7,
      awayForm: 0.4,
      h2hHomeWins: 3,
      h2hAwayWins: 1,
      parkPf: 105,
      homeTeam: 'LG',
      awayTeam: 'HT',
    };
    const v = vectorize(f);
    expect(v).toHaveLength(4);
    expect(v[0]).toBeCloseTo(100 / 400, 6); // 0.25
    expect(v[1]).toBeCloseTo(0.3, 6);
    expect(v[2]).toBeCloseTo(3 / 4 - 0.5, 6); // 0.25
    expect(v[3]).toBeCloseTo(0.5, 6);
  });

  it('handles null form as 0.5 neutral', () => {
    const f: GameFeatures = {
      homeElo: 1500,
      awayElo: 1500,
      homeForm: null,
      awayForm: null,
      h2hHomeWins: 0,
      h2hAwayWins: 0,
      parkPf: 100,
      homeTeam: 'LG',
      awayTeam: 'HT',
    };
    const v = vectorize(f);
    expect(v[1]).toBe(0);
    expect(v[2]).toBe(0); // h2hN < 2 → 0
    expect(v[3]).toBe(0);
  });
});
