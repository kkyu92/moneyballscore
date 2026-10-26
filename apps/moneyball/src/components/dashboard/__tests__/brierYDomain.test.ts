/**
 * BrierTrendChart Y축 domain — cycle 3664 review-code(heavy).
 * 고정 [0.15, 0.35] 가 CE 구간 소표본 Brier(~0.40) 를 plot 밖으로 잘라내던 문제.
 */
import { describe, it, expect } from "vitest";
import { brierYDomain, accuracyYDomain } from "../chart-format";

describe("brierYDomain", () => {
  it("범위 안 데이터 → 기본 [0.15, 0.35] 유지", () => {
    expect(brierYDomain([0.2, 0.25, null])).toEqual([0.15, 0.35]);
  });
  it("0.35 초과 → 상한 0.05 단위 확장", () => {
    expect(brierYDomain([0.24, 0.4003])).toEqual([0.15, 0.45]);
  });
  it("0.15 미만 → 하한 확장", () => {
    expect(brierYDomain([0.08, 0.25])).toEqual([0.05, 0.35]);
  });
  it("값 없음 → 기본값", () => {
    expect(brierYDomain([null, undefined])).toEqual([0.15, 0.35]);
  });
});

describe("accuracyYDomain", () => {
  it("범위 안 → 기본 [0.3, 0.7]", () => {
    expect(accuracyYDomain([0.45, 0.6, null])).toEqual([0.3, 0.7]);
  });
  it("소표본 0/1 → [0, 1] clamp", () => {
    expect(accuracyYDomain([0, 0.5, 1])).toEqual([0, 1]);
  });
  it("0.7 초과 → 0.1 단위 상한 확장", () => {
    expect(accuracyYDomain([0.5, 0.76])).toEqual([0.3, 0.8]);
  });
  it("값 없음 → 기본값", () => {
    expect(accuracyYDomain([null])).toEqual([0.3, 0.7]);
  });
});
