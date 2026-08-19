import { describe, expect, it } from "vitest";
import { pearsonCorrelation } from "../pearson";

describe("pearsonCorrelation", () => {
  it("returns 0 for fewer than 2 points", () => {
    expect(pearsonCorrelation([], [])).toBe(0);
    expect(pearsonCorrelation([1], [1])).toBe(0);
  });

  it("returns 1 for perfectly correlated values", () => {
    expect(pearsonCorrelation([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("returns -1 for perfectly anti-correlated values", () => {
    expect(pearsonCorrelation([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1);
  });

  it("returns 0 when either series has zero variance", () => {
    expect(pearsonCorrelation([1, 1, 1], [1, 2, 3])).toBe(0);
  });
});
