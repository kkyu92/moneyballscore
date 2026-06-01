import { describe, it, expect } from "vitest";
import {
  buildShadowCalibration,
  type ShadowCohortPair,
} from "@/lib/accuracy/buildShadowCalibration";

function pair(
  v18Prob: number | null,
  shadowProb: number | null,
  homeWin: boolean | null,
): ShadowCohortPair {
  return { v18Prob, shadowProb, homeWin };
}

describe("buildShadowCalibration", () => {
  it("returns 10 buckets per series by default", () => {
    const result = buildShadowCalibration([]);
    expect(result.v18.length).toBe(10);
    expect(result.shadow.length).toBe(10);
  });

  it("respects custom bin count", () => {
    const result = buildShadowCalibration([], 5);
    expect(result.v18.length).toBe(5);
    expect(result.shadow.length).toBe(5);
  });

  it("places probabilities in correct buckets", () => {
    const pairs: ShadowCohortPair[] = [
      pair(0.55, 0.62, true),
      pair(0.58, 0.65, true),
      pair(0.72, 0.78, false),
    ];
    const { v18, shadow } = buildShadowCalibration(pairs);
    expect(v18[5].n).toBe(2);
    expect(v18[5].avgPredicted).toBeCloseTo(0.565, 4);
    expect(v18[5].actualRate).toBe(1);
    expect(v18[7].n).toBe(1);
    expect(v18[7].actualRate).toBe(0);
    expect(shadow[6].n).toBe(2);
    expect(shadow[7].n).toBe(1);
  });

  it("skips pairs with null homeWin", () => {
    const pairs: ShadowCohortPair[] = [
      pair(0.55, 0.62, null),
      pair(0.58, 0.65, true),
    ];
    const { v18 } = buildShadowCalibration(pairs);
    expect(v18[5].n).toBe(1);
    expect(v18[5].avgPredicted).toBeCloseTo(0.58, 4);
  });

  it("skips null probs within a pair but keeps the other side", () => {
    const pairs: ShadowCohortPair[] = [
      pair(0.55, null, true),
      pair(null, 0.62, true),
    ];
    const { v18, shadow } = buildShadowCalibration(pairs);
    expect(v18[5].n).toBe(1);
    expect(v18[5].avgPredicted).toBeCloseTo(0.55, 4);
    expect(shadow[6].n).toBe(1);
    expect(shadow[6].avgPredicted).toBeCloseTo(0.62, 4);
  });

  it("includes p=1.0 in the last bucket", () => {
    const pairs: ShadowCohortPair[] = [pair(1.0, 1.0, true)];
    const { v18, shadow } = buildShadowCalibration(pairs);
    expect(v18[9].n).toBe(1);
    expect(shadow[9].n).toBe(1);
  });

  it("yields zero-counts buckets when no data falls in", () => {
    const pairs: ShadowCohortPair[] = [pair(0.55, 0.62, true)];
    const { v18 } = buildShadowCalibration(pairs);
    expect(v18[0].n).toBe(0);
    expect(v18[9].n).toBe(0);
    expect(v18[0].avgPredicted).toBe(0);
  });

  it("computes correct actualRate for mixed outcomes", () => {
    const pairs: ShadowCohortPair[] = [
      pair(0.65, 0.7, true),
      pair(0.65, 0.7, false),
      pair(0.65, 0.7, true),
    ];
    const { v18 } = buildShadowCalibration(pairs);
    expect(v18[6].n).toBe(3);
    expect(v18[6].actualRate).toBeCloseTo(2 / 3, 4);
  });
});
