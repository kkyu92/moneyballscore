// wave-614: /matchup/[teamA]/[teamB] 콜드게임(대량 득점차) 횟수
// 평균 득점차(wave-611)는 있었지만 "몇 번이나 크게 벌어졌는지" 빈도는 없던 gap.
// computeMatchupBlowoutCount — 신규 DB 조회 없이 buildMatchupProfile 이 이미
// 조회한 games 배열만으로 순수 계산, buildSummary 문장에 편입.

import { describe, it, expect } from "vitest";
import {
  computeMatchupBlowoutCount,
  type MatchupGame,
} from "@/lib/matchup/buildMatchupProfile";

function game(overrides: Partial<MatchupGame>): MatchupGame {
  return {
    gameId: 1,
    gameDate: "2026-07-01",
    homeCode: "LG",
    awayCode: "KT",
    homeScore: 3,
    awayScore: 1,
    predictedWinnerCode: null,
    actualWinnerCode: null,
    confidence: null,
    isCorrect: null,
    status: "final",
    ...overrides,
  };
}

describe("wave-614: computeMatchupBlowoutCount", () => {
  it("final 경기 없으면 null", () => {
    expect(computeMatchupBlowoutCount([])).toBeNull();
  });

  it("2경기만으론 표본 부족으로 null (최소 3경기)", () => {
    const games = [
      game({ gameDate: "2026-07-03", homeScore: 4, awayScore: 2 }),
      game({ gameDate: "2026-07-01", homeScore: 3, awayScore: 1 }),
    ];
    expect(computeMatchupBlowoutCount(games)).toBeNull();
  });

  it("점수 null 인 경기(예정 경기 등)는 표본에서 제외", () => {
    const games = [
      game({ gameDate: "2026-07-07", homeScore: null, awayScore: null, status: "scheduled" }),
      game({ gameDate: "2026-07-05", homeScore: 12, awayScore: 1 }), // margin 11
      game({ gameDate: "2026-07-03", homeScore: 4, awayScore: 2 }), // margin 2
      game({ gameDate: "2026-07-01", homeScore: 3, awayScore: 1 }), // margin 2
    ];
    expect(computeMatchupBlowoutCount(games)).toEqual({
      count: 1,
      sampleSize: 3,
    });
  });

  it("10점차 정확히 경계값도 콜드게임 카운트에 포함 (>=)", () => {
    const games = [
      game({ gameDate: "2026-07-05", homeScore: 10, awayScore: 0 }), // margin 10
      game({ gameDate: "2026-07-03", homeScore: 4, awayScore: 2 }), // margin 2
      game({ gameDate: "2026-07-01", homeScore: 3, awayScore: 1 }), // margin 2
    ];
    expect(computeMatchupBlowoutCount(games)).toEqual({
      count: 1,
      sampleSize: 3,
    });
  });

  it("승패 방향(홈/원정) 무관하게 절대값 마진으로 판정", () => {
    const games = [
      game({ gameDate: "2026-07-05", homeCode: "LG", awayCode: "KT", homeScore: 1, awayScore: 11 }), // margin 10
      game({ gameDate: "2026-07-03", homeCode: "KT", awayCode: "LG", homeScore: 1, awayScore: 2 }), // margin 1
      game({ gameDate: "2026-07-01", homeCode: "LG", awayCode: "KT", homeScore: 5, awayScore: 2 }), // margin 3
    ];
    expect(computeMatchupBlowoutCount(games)).toEqual({
      count: 1,
      sampleSize: 3,
    });
  });

  it("final 아닌 경기(진행중/예정)는 제외하고 final 만 집계", () => {
    const games = [
      game({ gameDate: "2026-07-07", status: "scheduled", homeScore: null, awayScore: null }),
      game({ gameDate: "2026-07-05", status: "final", homeScore: 11, awayScore: 0 }), // margin 11
      game({ gameDate: "2026-07-03", status: "final", homeScore: 3, awayScore: 0 }), // margin 3
      game({ gameDate: "2026-07-01", status: "final", homeScore: 2, awayScore: 1 }), // margin 1
    ];
    expect(computeMatchupBlowoutCount(games)).toEqual({
      count: 1,
      sampleSize: 3,
    });
  });

  it("콜드게임 0건이어도 sampleSize 는 정상 반환 (count=0)", () => {
    const games = [
      game({ gameDate: "2026-07-03", homeScore: 4, awayScore: 3 }), // margin 1
      game({ gameDate: "2026-07-02", homeScore: 2, awayScore: 1 }), // margin 1
      game({ gameDate: "2026-07-01", homeScore: 3, awayScore: 1 }), // margin 2
    ];
    expect(computeMatchupBlowoutCount(games)).toEqual({
      count: 0,
      sampleSize: 3,
    });
  });
});
