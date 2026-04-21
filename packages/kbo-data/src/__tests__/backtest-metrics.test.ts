import { describe, it, expect } from 'vitest';
import { computeMetrics, buildCalibration } from '../backtest/metrics';

describe('computeMetrics', () => {
  it('handles empty input', () => {
    const m = computeMetrics([], []);
    expect(m.n).toBe(0);
    expect(m.brier).toBe(0);
  });

  it('computes Brier / Accuracy on known cases', () => {
    // probs [0.8, 0.3], outcomes [1, 0]
    // Brier = ((0.8-1)^2 + (0.3-0)^2)/2 = (0.04 + 0.09)/2 = 0.065
    // Accuracy = 2/2 (0.8 >= .5 → 1 match, 0.3 < .5 → 0 match)
    const m = computeMetrics([0.8, 0.3], [1, 0]);
    expect(m.brier).toBeCloseTo(0.065, 6);
    expect(m.accuracy).toBe(1);
    expect(m.logLoss).toBeGreaterThan(0);
  });

  it('throws on length mismatch', () => {
    expect(() => computeMetrics([0.5], [1, 0])).toThrow();
  });

  it('perfect predictions: Brier 0, LogLoss near 0', () => {
    const m = computeMetrics([0.999999, 0.000001], [1, 0]);
    expect(m.brier).toBeLessThan(1e-10);
    expect(m.accuracy).toBe(1);
    expect(m.logLoss).toBeLessThan(0.001);
  });
});

describe('buildCalibration', () => {
  it('10 buckets by default', () => {
    const b = buildCalibration([0.05, 0.15, 0.55, 0.95], [0, 0, 1, 1]);
    expect(b).toHaveLength(10);
    expect(b[0].n).toBe(1); // 0.05 → bucket 0
    expect(b[1].n).toBe(1); // 0.15 → bucket 1
    expect(b[5].n).toBe(1); // 0.55 → bucket 5
    expect(b[9].n).toBe(1); // 0.95 → bucket 9
  });

  it('empty buckets return 0s', () => {
    const b = buildCalibration([0.5], [1]);
    expect(b[5].n).toBe(1);
    expect(b[5].avgPredicted).toBe(0.5);
    expect(b[5].actualRate).toBe(1);
    expect(b[0].n).toBe(0);
    expect(b[0].avgPredicted).toBe(0);
  });
});
