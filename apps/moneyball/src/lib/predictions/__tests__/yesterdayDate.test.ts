import { describe, it, expect } from "vitest";
import { getYesterdayKSTDateString } from "../yesterdayDate";

describe("getYesterdayKSTDateString", () => {
  it("returns previous day in KST when called mid-day KST", () => {
    // 2026-04-30 09:00 KST = 2026-04-30 00:00 UTC
    const now = new Date("2026-04-30T00:00:00Z");
    expect(getYesterdayKSTDateString(now)).toBe("2026-04-29");
  });

  it("returns previous day even shortly after KST midnight", () => {
    // 2026-05-01 00:30 KST = 2026-04-30 15:30 UTC
    const now = new Date("2026-04-30T15:30:00Z");
    expect(getYesterdayKSTDateString(now)).toBe("2026-04-30");
  });

  it("respects KST boundary (UTC 14:59 → 23:59 KST 같은 날)", () => {
    // 2026-04-30 23:59 KST = 2026-04-30 14:59 UTC → 어제는 2026-04-29
    const now = new Date("2026-04-30T14:59:00Z");
    expect(getYesterdayKSTDateString(now)).toBe("2026-04-29");
  });

  it("respects KST boundary (UTC 15:00 → 00:00 KST 다음 날)", () => {
    // 2026-04-30 15:00 UTC = 2026-05-01 00:00 KST → 어제는 2026-04-30
    const now = new Date("2026-04-30T15:00:00Z");
    expect(getYesterdayKSTDateString(now)).toBe("2026-04-30");
  });

  it("handles month rollover", () => {
    // 2026-05-01 09:00 KST → 어제는 2026-04-30
    const now = new Date("2026-05-01T00:00:00Z");
    expect(getYesterdayKSTDateString(now)).toBe("2026-04-30");
  });

  it("handles year rollover", () => {
    // 2027-01-01 09:00 KST → 어제는 2026-12-31
    const now = new Date("2027-01-01T00:00:00Z");
    expect(getYesterdayKSTDateString(now)).toBe("2026-12-31");
  });
});
