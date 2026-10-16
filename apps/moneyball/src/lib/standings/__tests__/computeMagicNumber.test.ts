import { describe, expect, it } from "vitest";
import { computeMagicNumber } from "../computeMagicNumber";

describe("computeMagicNumber", () => {
  it("표준 공식 (G - leaderWins - chaserLosses + 1)", () => {
    // G=144, leader 90승, chaser 45패 → 144-90-45+1 = 10
    expect(
      computeMagicNumber({ wins: 90, losses: 40, winPct: 0.692 }, { wins: 80, losses: 45, winPct: 0.64 }, 144)
    ).toBe(10);
  });

  it("leader 가 이미 확정(수치 음수) 시 0 으로 clamp", () => {
    expect(
      computeMagicNumber({ wins: 140, losses: 2, winPct: 0.986 }, { wins: 60, losses: 80, winPct: 0.429 }, 144)
    ).toBe(0);
  });

  it("leader 승률이 chaser 이하(동률/역전)면 null", () => {
    // 동률: 80/120 = 96/144 = 0.667
    expect(
      computeMagicNumber({ wins: 80, losses: 40, winPct: 0.667 }, { wins: 96, losses: 48, winPct: 0.667 }, 144)
    ).toBeNull();
    // 역전: leader 승률이 chaser 보다 낮음
    expect(
      computeMagicNumber({ wins: 70, losses: 50, winPct: 0.583 }, { wins: 80, losses: 45, winPct: 0.64 }, 144)
    ).toBeNull();
  });

  it("leader 승수가 chaser 보다 적어도 승률이 더 높으면 매직넘버 계산 (경기수 상이 — cycle 3216 review-code 버그 수정 회귀 테스트)", () => {
    // leader 75승40패(.652) vs chaser 80승45패(.640) — leader 는 승수는 적지만 순위상 실제로 앞섬(승률 기준)
    // 과거 버그: wins 단순 비교로 null 오반환 (매직넘버 뱃지 silent 누락)
    expect(
      computeMagicNumber({ wins: 75, losses: 40, winPct: 0.652 }, { wins: 80, losses: 45, winPct: 0.64 }, 144)
    ).toBe(144 - 75 - 45 + 1);
  });

  it("gamesPerTeam 기본값 = KBO_GAMES_PER_TEAM(144)", () => {
    expect(computeMagicNumber({ wins: 90, losses: 40, winPct: 0.692 }, { wins: 80, losses: 45, winPct: 0.64 })).toBe(
      10
    );
  });

  it("시즌 초반(잔여 다수) 시 큰 숫자도 정상 반환", () => {
    expect(
      computeMagicNumber({ wins: 10, losses: 5, winPct: 0.667 }, { wins: 8, losses: 6, winPct: 0.571 }, 144)
    ).toBe(129);
  });

  it("MLB gamesPerTeam=162 (division 매직넘버, cycle 2296 explore-idea heavy 재사용)", () => {
    // G=162, leader 100승, chaser(2위) 60패 → 162-100-60+1 = 3
    expect(
      computeMagicNumber({ wins: 100, losses: 55, winPct: 0.645 }, { wins: 90, losses: 60, winPct: 0.6 }, 162)
    ).toBe(3);
  });
});
