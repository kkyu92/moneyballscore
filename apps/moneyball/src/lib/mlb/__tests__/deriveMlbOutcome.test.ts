import { describe, it, expect } from "vitest";
import { deriveMlbOutcome } from "../deriveMlbOutcome";

describe("deriveMlbOutcome", () => {
  it("홈 승리 예측 + 홈 실제 승리 → isCorrect true", () => {
    const r = deriveMlbOutcome({
      homeWinProb: 0.62,
      hasFinalScore: true,
      homeScore: 5,
      awayScore: 3,
    });
    expect(r.predictedHomeWin).toBe(true);
    expect(r.actualHomeWin).toBe(true);
    expect(r.isCorrect).toBe(true);
    expect(r.confidence).toBeCloseTo(0.62);
  });

  it("홈 승리 예측 + 원정 실제 승리 → isCorrect false", () => {
    const r = deriveMlbOutcome({
      homeWinProb: 0.7,
      hasFinalScore: true,
      homeScore: 2,
      awayScore: 4,
    });
    expect(r.isCorrect).toBe(false);
  });

  it("home_win_prob === 0.5 → 홈 승리로 취급 (>=0.5)", () => {
    const r = deriveMlbOutcome({
      homeWinProb: 0.5,
      hasFinalScore: true,
      homeScore: 1,
      awayScore: 0,
    });
    expect(r.predictedHomeWin).toBe(true);
    expect(r.isCorrect).toBe(true);
  });

  it("home_win_prob null → predictedHomeWin/isCorrect/confidence 모두 null", () => {
    const r = deriveMlbOutcome({
      homeWinProb: null,
      hasFinalScore: true,
      homeScore: 3,
      awayScore: 1,
    });
    expect(r.predictedHomeWin).toBeNull();
    expect(r.isCorrect).toBeNull();
    expect(r.confidence).toBeNull();
    expect(r.actualHomeWin).toBe(true);
  });

  it("경기 미종료 (hasFinalScore false) → actualHomeWin/isCorrect null", () => {
    const r = deriveMlbOutcome({
      homeWinProb: 0.55,
      hasFinalScore: false,
      homeScore: null,
      awayScore: null,
    });
    expect(r.predictedHomeWin).toBe(true);
    expect(r.actualHomeWin).toBeNull();
    expect(r.isCorrect).toBeNull();
  });

  it("hasFinalScore true 인데 score null (방어) → actualHomeWin null", () => {
    const r = deriveMlbOutcome({
      homeWinProb: 0.55,
      hasFinalScore: true,
      homeScore: null,
      awayScore: 3,
    });
    expect(r.actualHomeWin).toBeNull();
    expect(r.isCorrect).toBeNull();
  });
});
