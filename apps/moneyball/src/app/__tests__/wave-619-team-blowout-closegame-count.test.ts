// wave-619: /teams/[code] 시즌 전체 콜드게임/박빙 승부 횟수
// buildMatchupProfile 의 computeMatchupBlowoutCount / computeMatchupCloseGameCount 는
// 두 팀 맞대결 한정 빈도를 잡지만, 팀 프로필(/teams/[code])엔 "이 팀이 시즌 전체에서
// 몇 번이나 콜드게임/박빙 승부를 겪었는지"가 없던 gap (wave-618 avgMargin 과 동일 패턴).
// computeTeamBlowoutCount / computeTeamCloseGameCount — buildTeamProfile 이 이미
// 조회한 teamGames 배열만으로 순수 계산, 신규 DB 조회 없음.

import { describe, it, expect } from "vitest";
import {
  computeTeamBlowoutCount,
  computeTeamCloseGameCount,
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

describe("wave-619: computeTeamBlowoutCount", () => {
  it("final 경기 없으면 null", () => {
    expect(computeTeamBlowoutCount([])).toBeNull();
  });

  it("2경기만으론 표본 부족으로 null (최소 3경기)", () => {
    const games = [
      game({ ourScore: 10, opponentScore: 0 }),
      game({ ourScore: 2, opponentScore: 1 }),
    ];
    expect(computeTeamBlowoutCount(games)).toBeNull();
  });

  it("|자팀-상대| >= 10 콜드게임만 카운트", () => {
    const games = [
      game({ gameDate: "2026-07-01", ourScore: 11, opponentScore: 1 }), // margin 10, blowout
      game({ gameDate: "2026-07-02", ourScore: 2, opponentScore: 1 }), // margin 1
      game({ gameDate: "2026-07-03", ourScore: 8, opponentScore: 0 }), // margin 8
    ];
    expect(computeTeamBlowoutCount(games)).toEqual({ count: 1, sampleSize: 3 });
  });

  it("final 아닌 경기/점수 null 은 표본에서 제외", () => {
    const games = [
      game({ gameDate: "2026-07-01", status: "scheduled", ourScore: null, opponentScore: null }),
      game({ gameDate: "2026-07-02", ourScore: 12, opponentScore: 0 }), // margin 12
      game({ gameDate: "2026-07-03", ourScore: 3, opponentScore: 2 }), // margin 1
      game({ gameDate: "2026-07-04", ourScore: 5, opponentScore: 4 }), // margin 1
    ];
    expect(computeTeamBlowoutCount(games)).toEqual({ count: 1, sampleSize: 3 });
  });
});

describe("wave-619: computeTeamCloseGameCount", () => {
  it("final 경기 없으면 null", () => {
    expect(computeTeamCloseGameCount([])).toBeNull();
  });

  it("2경기만으론 표본 부족으로 null (최소 3경기)", () => {
    const games = [
      game({ ourScore: 3, opponentScore: 2 }),
      game({ ourScore: 2, opponentScore: 1 }),
    ];
    expect(computeTeamCloseGameCount(games)).toBeNull();
  });

  it("|자팀-상대| === 1 박빙 승부만 카운트", () => {
    const games = [
      game({ gameDate: "2026-07-01", ourScore: 3, opponentScore: 2 }), // margin 1, close
      game({ gameDate: "2026-07-02", ourScore: 10, opponentScore: 0 }), // margin 10
      game({ gameDate: "2026-07-03", ourScore: 5, opponentScore: 4 }), // margin 1, close
    ];
    expect(computeTeamCloseGameCount(games)).toEqual({ count: 2, sampleSize: 3 });
  });

  it("final 아닌 경기/점수 null 은 표본에서 제외", () => {
    const games = [
      game({ gameDate: "2026-07-01", status: "scheduled", ourScore: null, opponentScore: null }),
      game({ gameDate: "2026-07-02", ourScore: 4, opponentScore: 3 }), // margin 1
      game({ gameDate: "2026-07-03", ourScore: 6, opponentScore: 5 }), // margin 1
      game({ gameDate: "2026-07-04", ourScore: 9, opponentScore: 1 }), // margin 8
    ];
    expect(computeTeamCloseGameCount(games)).toEqual({ count: 2, sampleSize: 3 });
  });
});
