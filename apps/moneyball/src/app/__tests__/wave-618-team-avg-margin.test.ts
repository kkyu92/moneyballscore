// wave-618: /teams/[code] 시즌 전체 평균 득점 마진
// buildMatchupProfile 의 computeMatchupAvgMargin 은 두 팀 맞대결 한정 평균 마진을
// 잡지만, 팀 프로필(/teams/[code])엔 "이 팀이 모든 상대 포함 시즌 전체에서 평균
// 몇 점차로 이기고 지는지"가 없던 gap. computeTeamAvgMargin — buildTeamProfile 이
// 이미 조회한 teamGames 배열만으로 순수 계산, 신규 DB 조회 없음.

import { describe, it, expect } from "vitest";
import {
  computeTeamAvgMargin,
  type TeamRecentGame,
} from "@/lib/teams/buildTeamProfile";

function game(overrides: Partial<TeamRecentGame>): TeamRecentGame {
  return {
    gameId: 1,
    gameDate: "2026-07-01",
    isHome: true,
    opponentName: "KT",
    predictedAsWinner: true,
    confidence: null,
    isCorrect: null,
    ourScore: 3,
    opponentScore: 1,
    status: "final",
    ...overrides,
  };
}

describe("wave-618: computeTeamAvgMargin", () => {
  it("final 경기 없으면 null", () => {
    expect(computeTeamAvgMargin([])).toBeNull();
  });

  it("1경기만으론 표본 부족으로 null (최소 2경기)", () => {
    const games = [game({ gameDate: "2026-07-01", ourScore: 4, opponentScore: 1 })];
    expect(computeTeamAvgMargin(games)).toBeNull();
  });

  it("점수 null 인 경기(예정 경기 등)는 표본에서 제외", () => {
    const games = [
      game({ gameDate: "2026-07-07", ourScore: null, opponentScore: null, status: "scheduled" }),
      game({ gameDate: "2026-07-05", ourScore: 4, opponentScore: 3 }), // margin 1
      game({ gameDate: "2026-07-03", ourScore: 4, opponentScore: 2 }), // margin 2
    ];
    expect(computeTeamAvgMargin(games)).toEqual({
      avgMargin: 1.5,
      sampleSize: 2,
    });
  });

  it("승패 무관하게 절대값 마진 평균 (우리가 진 경기도 포함)", () => {
    const games = [
      game({ gameDate: "2026-07-05", ourScore: 1, opponentScore: 5 }), // margin 4, 패
      game({ gameDate: "2026-07-03", ourScore: 6, opponentScore: 2 }), // margin 4, 승
    ];
    expect(computeTeamAvgMargin(games)).toEqual({
      avgMargin: 4,
      sampleSize: 2,
    });
  });

  it("소수점 첫째자리로 반올림", () => {
    const games = [
      game({ gameDate: "2026-07-05", ourScore: 5, opponentScore: 4 }), // margin 1
      game({ gameDate: "2026-07-03", ourScore: 5, opponentScore: 3 }), // margin 2
      game({ gameDate: "2026-07-01", ourScore: 5, opponentScore: 2 }), // margin 3
    ];
    // avg = (1+2+3)/3 = 2
    expect(computeTeamAvgMargin(games)).toEqual({
      avgMargin: 2,
      sampleSize: 3,
    });
  });

  it("final 아닌 경기(진행중/예정)는 제외하고 final 만 집계", () => {
    const games = [
      game({ gameDate: "2026-07-07", status: "scheduled", ourScore: null, opponentScore: null }),
      game({ gameDate: "2026-07-05", status: "final", ourScore: 3, opponentScore: 2 }), // margin 1
      game({ gameDate: "2026-07-03", status: "final", ourScore: 5, opponentScore: 1 }), // margin 4
    ];
    expect(computeTeamAvgMargin(games)).toEqual({
      avgMargin: 2.5,
      sampleSize: 2,
    });
  });
});
