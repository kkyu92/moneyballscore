import { describe, it, expect } from "vitest";
import { insightsStatusBadge } from "../statusBadge";

describe("insightsStatusBadge", () => {
  it("postponed → 취소 (isCorrect 무관)", () => {
    expect(insightsStatusBadge("postponed", null).label).toBe("취소");
    expect(insightsStatusBadge("postponed", true).label).toBe("취소");
  });

  it("isCorrect=true → 적중", () => {
    expect(insightsStatusBadge("final", true).label).toBe("적중");
  });

  it("isCorrect=false → 빗나감", () => {
    expect(insightsStatusBadge("final", false).label).toBe("빗나감");
  });

  it("live → 진행중 (ALL_GAME_STATUSES 4종 중 postponed/final 다음 신규 분기, silent drift 방지)", () => {
    const badge = insightsStatusBadge("live", null);
    expect(badge.label).toBe("진행중");
  });

  it("final + isCorrect=null → 결과 대기", () => {
    expect(insightsStatusBadge("final", null).label).toBe("결과 대기");
  });

  it("scheduled → 예정", () => {
    expect(insightsStatusBadge("scheduled", null).label).toBe("예정");
  });
});
