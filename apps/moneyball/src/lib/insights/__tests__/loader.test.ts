import { describe, expect, it } from "vitest";
import { isValidInsightsDate } from "../loader";

describe("isValidInsightsDate", () => {
  it("ISO YYYY-MM-DD 정상 일자 → true", () => {
    expect(isValidInsightsDate("2026-05-21")).toBe(true);
    expect(isValidInsightsDate("2025-12-31")).toBe(true);
    expect(isValidInsightsDate("2023-01-01")).toBe(true);
  });

  it("format mismatch → false", () => {
    expect(isValidInsightsDate("2026-5-21")).toBe(false);
    expect(isValidInsightsDate("26-05-21")).toBe(false);
    expect(isValidInsightsDate("2026/05/21")).toBe(false);
    expect(isValidInsightsDate("20260521")).toBe(false);
    expect(isValidInsightsDate("")).toBe(false);
  });

  it("year prefix mismatch (regex 20[2-9]\\d) → false", () => {
    expect(isValidInsightsDate("1999-12-31")).toBe(false);
    expect(isValidInsightsDate("2010-01-01")).toBe(false);
    expect(isValidInsightsDate("3000-01-01")).toBe(false);
  });

  it("month/day out of range → false", () => {
    expect(isValidInsightsDate("2026-00-15")).toBe(false);
    expect(isValidInsightsDate("2026-13-15")).toBe(false);
    expect(isValidInsightsDate("2026-05-00")).toBe(false);
    expect(isValidInsightsDate("2026-05-32")).toBe(false);
  });

  it("실제 존재하지 않는 일자 (윤년 외 2/29 / 2/30 등) → false", () => {
    expect(isValidInsightsDate("2025-02-29")).toBe(false);
    expect(isValidInsightsDate("2026-02-30")).toBe(false);
    expect(isValidInsightsDate("2026-04-31")).toBe(false);
    expect(isValidInsightsDate("2026-06-31")).toBe(false);
  });

  it("윤년 2/29 → true", () => {
    expect(isValidInsightsDate("2024-02-29")).toBe(true);
    expect(isValidInsightsDate("2028-02-29")).toBe(true);
  });
});
