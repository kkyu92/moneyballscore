import { describe, it, expect } from "vitest";
import {
  getWeekRangeFromDate,
  parseWeekId,
  getRecentWeeks,
} from "../computeWeekRange";

describe("getWeekRangeFromDate", () => {
  it("2026-04-15 (수) → 2026-W16, 월=04-13 / 일=04-19", () => {
    const r = getWeekRangeFromDate(new Date("2026-04-15T12:00:00Z"));
    expect(r.weekId).toBe("2026-W16");
    expect(r.year).toBe(2026);
    expect(r.week).toBe(16);
    expect(r.startDate).toBe("2026-04-13");
    expect(r.endDate).toBe("2026-04-19");
  });

  it("연말 경계: 2024-12-30 (월) → 2025-W01", () => {
    const r = getWeekRangeFromDate(new Date("2024-12-30T00:00:00Z"));
    expect(r.weekId).toBe("2025-W01");
  });

  it("연초 경계: 2023-01-01 (일) → 2022-W52", () => {
    const r = getWeekRangeFromDate(new Date("2023-01-01T12:00:00Z"));
    expect(r.weekId).toBe("2022-W52");
  });

  it("라벨: 같은 달이면 '~ 일' 형태", () => {
    const r = getWeekRangeFromDate(new Date("2026-04-15T00:00:00Z"));
    expect(r.label).toContain("4월 13일 ~ 19일");
  });

  it("라벨: 월 경계면 '~ 월 일'", () => {
    const r = getWeekRangeFromDate(new Date("2026-04-29T00:00:00Z"));
    expect(r.label).toMatch(/4월.*~.*5월/);
  });
});

describe("parseWeekId", () => {
  it("'2026-W16' → 4/13~4/19", () => {
    const r = parseWeekId("2026-W16");
    expect(r).not.toBeNull();
    expect(r?.startDate).toBe("2026-04-13");
    expect(r?.endDate).toBe("2026-04-19");
  });

  it("잘못된 포맷 → null", () => {
    expect(parseWeekId("2026-16")).toBeNull();
    expect(parseWeekId("2026-W")).toBeNull();
    expect(parseWeekId("2026-W99")).toBeNull();
    expect(parseWeekId("foo")).toBeNull();
  });

  it("week 53 — 유효하지 않은 해면 null", () => {
    // 2025년은 week 52까지만 (1/1이 수요일 → week 1이 1/1 부터, 53주차 없음)
    expect(parseWeekId("2025-W53")).toBeNull();
  });

  it("week 53 — 유효한 해는 허용 (2026년 목요일 1/1 시작)", () => {
    const r = parseWeekId("2026-W53");
    expect(r).not.toBeNull();
    expect(r?.startDate).toBe("2026-12-28");
    expect(r?.endDate).toBe("2027-01-03");
  });

  it("왕복 호환: getWeekRangeFromDate → parseWeekId 결과 일치", () => {
    const r1 = getWeekRangeFromDate(new Date("2026-04-15T00:00:00Z"));
    const r2 = parseWeekId(r1.weekId);
    expect(r2?.startDate).toBe(r1.startDate);
    expect(r2?.endDate).toBe(r1.endDate);
  });
});

describe("getRecentWeeks", () => {
  it("count=4면 최근 4주 반환 (오래된 → 최신 순)", () => {
    const weeks = getRecentWeeks(4, new Date("2026-04-20T00:00:00Z"));
    expect(weeks).toHaveLength(4);
    expect(weeks[0].weekId < weeks[3].weekId).toBe(true);
    expect(weeks[3].weekId).toBe("2026-W17"); // 4/20 월요일 = W17
  });

  it("count=1은 현재 주만", () => {
    const weeks = getRecentWeeks(1, new Date("2026-04-15T00:00:00Z"));
    expect(weeks).toHaveLength(1);
    expect(weeks[0].weekId).toBe("2026-W16");
  });
});
