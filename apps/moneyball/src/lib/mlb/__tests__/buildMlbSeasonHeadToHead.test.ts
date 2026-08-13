import { describe, expect, it } from "vitest";
import { buildMlbSeasonHeadToHead } from "../buildMlbSeasonHeadToHead";
import type { MlbMatchupGame } from "../buildMlbMatchupProfile";

function game(overrides: Partial<MlbMatchupGame>): MlbMatchupGame {
  return {
    gameId: 1,
    gameDate: "2026-05-01",
    homeCode: "NYY",
    awayCode: "BOS",
    homeScore: 3,
    awayScore: 2,
    predictedWinnerCode: null,
    actualWinnerCode: "NYY",
    confidence: null,
    isCorrect: null,
    status: "final",
    ...overrides,
  };
}

describe("buildMlbSeasonHeadToHead", () => {
  it("연도별로 그룹핑해 승패 카운트 (최신 연도 먼저)", () => {
    const games: MlbMatchupGame[] = [
      game({ gameId: 1, gameDate: "2023-04-01", actualWinnerCode: "NYY" }),
      game({ gameId: 2, gameDate: "2023-08-01", actualWinnerCode: "BOS" }),
      game({ gameId: 3, gameDate: "2024-05-01", actualWinnerCode: "NYY" }),
      game({ gameId: 4, gameDate: "2026-06-01", actualWinnerCode: "NYY" }),
    ];
    const result = buildMlbSeasonHeadToHead(games, "NYY", "BOS");
    expect(result).toEqual([
      { year: "2026", aWins: 1, bWins: 0, played: 1 },
      { year: "2024", aWins: 1, bWins: 0, played: 1 },
      { year: "2023", aWins: 1, bWins: 1, played: 2 },
    ]);
  });

  it("final 아닌 경기 / winner 없는 경기 제외", () => {
    const games: MlbMatchupGame[] = [
      game({ gameId: 1, status: "scheduled", actualWinnerCode: null }),
      game({ gameId: 2, status: "final", actualWinnerCode: null }),
      game({ gameId: 3, status: "final", actualWinnerCode: "BOS" }),
    ];
    const result = buildMlbSeasonHeadToHead(games, "NYY", "BOS");
    expect(result).toEqual([{ year: "2026", aWins: 0, bWins: 1, played: 1 }]);
  });

  it("빈 배열이면 빈 결과", () => {
    expect(buildMlbSeasonHeadToHead([], "NYY", "BOS")).toEqual([]);
  });
});
