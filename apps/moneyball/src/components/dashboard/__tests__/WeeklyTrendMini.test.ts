/**
 * WeeklyTrendMini aria-label — cycle 3663 review-code(heavy).
 * 검증 0경기 주(시즌 종료·휴식주)는 rate=0 이 "0%" 로 낭독되던 문제 — "데이터 없음" 으로 분리.
 */
import { describe, it, expect } from "vitest";
import { weekAriaLabel } from "../WeeklyTrendMini";

describe("weekAriaLabel", () => {
  it("verified=0 → 데이터 없음 (0% 아님)", () => {
    expect(weekAriaLabel({ label: "W42", rate: 0, verified: 0 })).toBe("W42 주간 리뷰 보기 (데이터 없음)");
  });
  it("verified>0 → 반올림 %", () => {
    expect(weekAriaLabel({ label: "W41", rate: 0.6, verified: 5 })).toBe("W41 주간 리뷰 보기 (60%)");
  });
});
