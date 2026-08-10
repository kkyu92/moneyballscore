// wave-622: /teams/[code] 시즌 전체 최근 연승/연패 스트릭
// buildMatchupProfile 의 computeMatchupStreak 은 두 팀 맞대결 한정 스트릭을 잡지만,
// 팀 프로필(/teams/[code])엔 "이 팀이 모든 상대 포함 최근 전체 흐름에서" 몇 연승/연패
// 중인지가 없던 gap (wave-618/619 avgMargin/blowout/closeGame 과 동일 패턴).
// computeTeamStreak — buildTeamProfile 이 이미 조회한 teamGames 배열만으로 순수 계산,
// 신규 DB 조회 없음. games 는 game_date 내림차순 정렬 전달 (matchup 과 동일 계약).

import { describe, it, expect } from "vitest";
import {
  computeTeamStreak,
  type TeamRecentGame,
} from "@/lib/teams/buildTeamProfile";

function game(overrides: Partial<TeamRecentGame>): TeamRecentGame {
  return {
    gameId: 1,
    gameDate: "2026-07-01",
    isHome: true,
    opponentCode: "KT",
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

describe("wave-622: computeTeamStreak", () => {
  it("final 경기 없으면 null", () => {
    expect(computeTeamStreak([])).toBeNull();
  });

  it("1승만으론 스트릭이라 부르기 애매해 null (최소 2)", () => {
    const games = [game({ gameDate: "2026-07-03", ourScore: 3, opponentScore: 1 })];
    expect(computeTeamStreak(games)).toBeNull();
  });

  it("최근 경기부터 연승 카운트 (내림차순 정렬 가정)", () => {
    const games = [
      game({ gameDate: "2026-07-05", ourScore: 5, opponentScore: 2 }), // win
      game({ gameDate: "2026-07-04", ourScore: 3, opponentScore: 1 }), // win
      game({ gameDate: "2026-07-03", ourScore: 4, opponentScore: 2 }), // win
      game({ gameDate: "2026-07-02", ourScore: 1, opponentScore: 6 }), // loss (스트릭 끊김)
    ];
    expect(computeTeamStreak(games)).toEqual({ result: "win", length: 3 });
  });

  it("최근 경기부터 연패 카운트", () => {
    const games = [
      game({ gameDate: "2026-07-05", ourScore: 1, opponentScore: 4 }), // loss
      game({ gameDate: "2026-07-04", ourScore: 0, opponentScore: 3 }), // loss
      game({ gameDate: "2026-07-03", ourScore: 6, opponentScore: 2 }), // win (스트릭 끊김)
    ];
    expect(computeTeamStreak(games)).toEqual({ result: "loss", length: 2 });
  });

  it("가장 최근 경기가 무승부면 스트릭 없음", () => {
    const games = [
      game({ gameDate: "2026-07-05", ourScore: 3, opponentScore: 3 }), // draw
      game({ gameDate: "2026-07-04", ourScore: 5, opponentScore: 1 }), // win
    ];
    expect(computeTeamStreak(games)).toBeNull();
  });

  it("final 아닌 경기/점수 null 은 스트릭 계산에서 제외", () => {
    const games = [
      game({ gameDate: "2026-07-06", status: "scheduled", ourScore: null, opponentScore: null }),
      game({ gameDate: "2026-07-05", ourScore: 4, opponentScore: 1 }), // win
      game({ gameDate: "2026-07-04", ourScore: 2, opponentScore: 0 }), // win
    ];
    expect(computeTeamStreak(games)).toEqual({ result: "win", length: 2 });
  });
});
