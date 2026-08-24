import { describe, it, expect } from "vitest";
import {
  getMonthRangeFromDate,
  parseMonthId,
  getRecentMonths,
  getPreviousMonth,
} from "../computeMonthRange";

describe("getMonthRangeFromDate", () => {
  it("2026-04-18 → 2026-04 (4/1 ~ 4/30)", () => {
    const r = getMonthRangeFromDate(new Date("2026-04-18T12:00:00Z"));
    expect(r.monthId).toBe("2026-04");
    expect(r.year).toBe(2026);
    expect(r.month).toBe(4);
    expect(r.startDate).toBe("2026-04-01");
    expect(r.endDate).toBe("2026-04-30");
    expect(r.label).toBe("2026년 4월");
  });

  it("윤년 2월: 2024-02 → 2/29로 끝남", () => {
    const r = getMonthRangeFromDate(new Date("2024-02-15T00:00:00Z"));
    expect(r.endDate).toBe("2024-02-29");
  });

  it("평년 2월: 2025-02 → 2/28로 끝남", () => {
    const r = getMonthRangeFromDate(new Date("2025-02-10T00:00:00Z"));
    expect(r.endDate).toBe("2025-02-28");
  });

  it("12월 경계", () => {
    const r = getMonthRangeFromDate(new Date("2026-12-20T00:00:00Z"));
    expect(r.monthId).toBe("2026-12");
    expect(r.endDate).toBe("2026-12-31");
  });

  it("locale='en' — 'Month YYYY' (한글 미포함)", () => {
    const r = getMonthRangeFromDate(new Date("2026-04-18T12:00:00Z"), "en");
    expect(r.label).toBe("April 2026");
    expect(r.label).not.toMatch(/[가-힣]/);
  });

  it("KST 월 경계 00:00~09:00 — UTC 기준이면 전월로 오판정되던 구간, KST 기준 새 달로 정정", () => {
    // 2026-09-01(화) 00:30 KST = 2026-08-31T15:30:00Z (UTC 기준으로는 아직 8월)
    const r = getMonthRangeFromDate(new Date("2026-08-31T15:30:00Z"));
    expect(r.monthId).toBe("2026-09");
  });

  it("KST 월 경계 08:59 — 여전히 새 달 (UTC 기준 오판정 구간의 마지막 순간)", () => {
    // 2026-09-01(화) 08:59 KST = 2026-08-31T23:59:00Z
    const r = getMonthRangeFromDate(new Date("2026-08-31T23:59:00Z"));
    expect(r.monthId).toBe("2026-09");
  });
});

describe("parseMonthId", () => {
  it("'2026-04' → 4/1 ~ 4/30", () => {
    const r = parseMonthId("2026-04");
    expect(r).not.toBeNull();
    expect(r?.startDate).toBe("2026-04-01");
    expect(r?.endDate).toBe("2026-04-30");
  });

  it("잘못된 형식 → null", () => {
    expect(parseMonthId("2026-4")).toBeNull();
    expect(parseMonthId("2026/04")).toBeNull();
    expect(parseMonthId("foo")).toBeNull();
    expect(parseMonthId("2026-13")).toBeNull();
    expect(parseMonthId("2026-00")).toBeNull();
  });

  it("범위 밖 연도 → null", () => {
    expect(parseMonthId("1999-04")).toBeNull();
    expect(parseMonthId("2101-01")).toBeNull();
  });

  it("locale='en' 전달 시 라벨도 영문 (한글 미포함)", () => {
    const r = parseMonthId("2026-04", "en");
    expect(r?.label).toBe("April 2026");
  });
});

describe("getRecentMonths", () => {
  it("count=3이면 최근 3개월 (오래된 → 최신)", () => {
    const months = getRecentMonths(3, new Date("2026-04-20T00:00:00Z"));
    expect(months.map((m) => m.monthId)).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
    ]);
  });

  it("연도 경계: 2026-01에서 최근 3개월 → 2025-11, 2025-12, 2026-01", () => {
    const months = getRecentMonths(3, new Date("2026-01-10T00:00:00Z"));
    expect(months.map((m) => m.monthId)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
  });

  it("count=1은 현재 월만", () => {
    const months = getRecentMonths(1, new Date("2026-04-15T00:00:00Z"));
    expect(months).toHaveLength(1);
    expect(months[0].monthId).toBe("2026-04");
  });
});

describe("getPreviousMonth", () => {
  it("4월 → 3월", () => {
    const current = parseMonthId("2026-04")!;
    const prev = getPreviousMonth(current);
    expect(prev.monthId).toBe("2026-03");
  });

  it("1월 → 전년 12월", () => {
    const current = parseMonthId("2026-01")!;
    const prev = getPreviousMonth(current);
    expect(prev.monthId).toBe("2025-12");
  });
});
