import { describe, expect, it } from "vitest";
import { computeMagicNumber } from "../computeMagicNumber";

describe("computeMagicNumber", () => {
  it("표준 공식 (G - leaderWins - chaserLosses + 1)", () => {
    // G=144, leader 90승, chaser 45패 → 144-90-45+1 = 10
    expect(computeMagicNumber({ wins: 90, losses: 40 }, { wins: 80, losses: 45 }, 144)).toBe(10);
  });

  it("leader 가 이미 확정(수치 음수) 시 0 으로 clamp", () => {
    expect(computeMagicNumber({ wins: 140, losses: 2 }, { wins: 60, losses: 80 }, 144)).toBe(0);
  });

  it("leader 승수가 chaser 이하(동률/역전)면 null", () => {
    expect(computeMagicNumber({ wins: 80, losses: 40 }, { wins: 80, losses: 45 }, 144)).toBeNull();
    expect(computeMagicNumber({ wins: 75, losses: 40 }, { wins: 80, losses: 45 }, 144)).toBeNull();
  });

  it("gamesPerTeam 기본값 = KBO_GAMES_PER_TEAM(144)", () => {
    expect(computeMagicNumber({ wins: 90, losses: 40 }, { wins: 80, losses: 45 })).toBe(10);
  });

  it("시즌 초반(잔여 다수) 시 큰 숫자도 정상 반환", () => {
    expect(computeMagicNumber({ wins: 10, losses: 5 }, { wins: 8, losses: 6 }, 144)).toBe(129);
  });
});
