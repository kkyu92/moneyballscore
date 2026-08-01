// wave-613: /matchup/[teamA]/[teamB] 최근 N경기 한정 상대전적
// 전체 시즌 기록(sideStats)과 연속 연승/연패(streak)는 있었지만
// "최근 5경기만 보면 누가 더 우세한지" 폼 스냅샷은 없던 gap.
// computeMatchupRecentRecord — 신규 DB 조회 없이 buildMatchupProfile 이
// 이미 조회한 games 배열만으로 순수 계산, buildSummary 문장에 편입.

import { describe, it, expect } from "vitest";
import {
  computeMatchupRecentRecord,
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

describe("wave-613: computeMatchupRecentRecord", () => {
  it("final 경기 없으면 null", () => {
    expect(computeMatchupRecentRecord([], "LG", "KT")).toBeNull();
  });

  it("1경기만으론 표본 부족으로 null (최소 2경기)", () => {
    const games = [game({ actualWinnerCode: "LG" })];
    expect(computeMatchupRecentRecord(games, "LG", "KT")).toBeNull();
  });

  it("최근 5경기 window 안에서 승수 카운트", () => {
    const games = [
      game({ gameDate: "2026-07-05", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-04", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-03", actualWinnerCode: "KT" }),
      game({ gameDate: "2026-07-02", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-01", actualWinnerCode: "KT" }),
    ];
    expect(computeMatchupRecentRecord(games, "LG", "KT")).toEqual({
      aWins: 3,
      bWins: 2,
      sampleSize: 5,
    });
  });

  it("window(5) 초과분은 무시 — 가장 최근 5경기만 집계", () => {
    const games = [
      game({ gameDate: "2026-07-06", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-05", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-04", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-03", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-02", actualWinnerCode: "LG" }),
      // 6번째(가장 오래된) 경기 — window 밖, KT 승이어도 무시
      game({ gameDate: "2026-07-01", actualWinnerCode: "KT" }),
    ];
    expect(computeMatchupRecentRecord(games, "LG", "KT")).toEqual({
      aWins: 5,
      bWins: 0,
      sampleSize: 5,
    });
  });

  it("final 아닌 경기(예정)는 제외하고 final 만 집계", () => {
    const games = [
      game({ gameDate: "2026-07-05", status: "scheduled", actualWinnerCode: null }),
      game({ gameDate: "2026-07-03", actualWinnerCode: "KT" }),
      game({ gameDate: "2026-07-01", actualWinnerCode: "LG" }),
    ];
    expect(computeMatchupRecentRecord(games, "LG", "KT")).toEqual({
      aWins: 1,
      bWins: 1,
      sampleSize: 2,
    });
  });

  it("무승부(actualWinnerCode null)는 표본엔 포함되지만 어느 팀 승수에도 안 잡힘", () => {
    const games = [
      game({ gameDate: "2026-07-03", actualWinnerCode: null }),
      game({ gameDate: "2026-07-01", actualWinnerCode: "LG" }),
    ];
    expect(computeMatchupRecentRecord(games, "LG", "KT")).toEqual({
      aWins: 1,
      bWins: 0,
      sampleSize: 2,
    });
  });
});
