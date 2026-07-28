// wave-611: /matchup/[teamA]/[teamB] 맞대결 평균 득점 마진
// 경기 기록(games)은 이미 있었지만 "이 맞대결이 보통 몇 점차로 갈리는지"는
// 요약 문장에 없던 gap. computeMatchupAvgMargin — 신규 DB 조회 없이
// buildMatchupProfile 이 이미 조회한 games 배열만으로 순수 계산, buildSummary 문장에 편입.

import { describe, it, expect } from "vitest";
import {
  computeMatchupAvgMargin,
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

describe("wave-611: computeMatchupAvgMargin", () => {
  it("final 경기 없으면 null", () => {
    expect(computeMatchupAvgMargin([])).toBeNull();
  });

  it("1경기만으론 평균 표본 부족으로 null (최소 2경기)", () => {
    expect(
      computeMatchupAvgMargin([game({ homeScore: 5, awayScore: 2 })]),
    ).toBeNull();
  });

  it("점수 null 인 경기(예정 경기 등)는 표본에서 제외", () => {
    const games = [
      game({ gameDate: "2026-07-05", homeScore: null, awayScore: null, status: "scheduled" }),
      game({ gameDate: "2026-07-03", homeScore: 4, awayScore: 2 }),
      game({ gameDate: "2026-07-01", homeScore: 3, awayScore: 1 }),
    ];
    expect(computeMatchupAvgMargin(games)).toEqual({
      avgMargin: 2,
      sampleSize: 2,
    });
  });

  it("평균 마진 소수 첫째 자리까지 반올림", () => {
    const games = [
      game({ gameDate: "2026-07-05", homeScore: 5, awayScore: 1 }), // margin 4
      game({ gameDate: "2026-07-03", homeScore: 2, awayScore: 3 }), // margin 1
      game({ gameDate: "2026-07-01", homeScore: 1, awayScore: 1 }), // margin 0
    ];
    // (4 + 1 + 0) / 3 = 1.666... -> 1.7
    expect(computeMatchupAvgMargin(games)).toEqual({
      avgMargin: 1.7,
      sampleSize: 3,
    });
  });

  it("승패 방향(홈/원정) 무관하게 절대값 마진만 계산", () => {
    const games = [
      game({ gameDate: "2026-07-05", homeCode: "LG", awayCode: "KT", homeScore: 1, awayScore: 6 }), // margin 5
      game({ gameDate: "2026-07-01", homeCode: "KT", awayCode: "LG", homeScore: 1, awayScore: 6 }), // margin 5
    ];
    expect(computeMatchupAvgMargin(games)).toEqual({
      avgMargin: 5,
      sampleSize: 2,
    });
  });

  it("final 아닌 경기(진행중/예정)는 제외하고 final 만 집계", () => {
    const games = [
      game({ gameDate: "2026-07-05", status: "scheduled", homeScore: null, awayScore: null }),
      game({ gameDate: "2026-07-03", status: "final", homeScore: 3, awayScore: 0 }), // margin 3
      game({ gameDate: "2026-07-01", status: "final", homeScore: 2, awayScore: 1 }), // margin 1
    ];
    expect(computeMatchupAvgMargin(games)).toEqual({
      avgMargin: 2,
      sampleSize: 2,
    });
  });
});
