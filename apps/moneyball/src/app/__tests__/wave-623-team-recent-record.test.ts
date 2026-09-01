// wave-623: /teams/[code] 시즌 전체 최근 N경기 한정 성적
// computeTeamStreak 은 "연속" 여부만 잡아, 중간에 무승부/스트릭 끊김이 있으면
// 최근 폼 전체("최근 5경기 중 몇 승 몇 패")를 못 보여주는 gap (matchup 쪽
// computeMatchupRecentRecord 과 대응하는 team-scope parity, wave-618/619/622 연장).
// computeTeamRecentRecord — buildTeamProfile 이 이미 조회한 teamGames 배열만으로
// 순수 계산, 신규 DB 조회 없음. games 는 game_date 내림차순 정렬 전달 (streak 과 동일 계약).

import { describe, it, expect } from "vitest";
import {
  computeTeamRecentRecord,
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

describe("wave-623: computeTeamRecentRecord", () => {
  it("final 경기 없으면 null", () => {
    expect(computeTeamRecentRecord([])).toBeNull();
  });

  it("1경기만으론 표본 부족으로 null (최소 2경기)", () => {
    const games = [game({ ourScore: 3, opponentScore: 1 })];
    expect(computeTeamRecentRecord(games)).toBeNull();
  });

  it("최근 5경기 window 안에서 승패 카운트 (내림차순 정렬 가정)", () => {
    const games = [
      game({ gameDate: "2026-07-05", ourScore: 5, opponentScore: 2 }), // win
      game({ gameDate: "2026-07-04", ourScore: 1, opponentScore: 4 }), // loss
      game({ gameDate: "2026-07-03", ourScore: 3, opponentScore: 1 }), // win
      game({ gameDate: "2026-07-02", ourScore: 2, opponentScore: 6 }), // loss
      game({ gameDate: "2026-07-01", ourScore: 4, opponentScore: 3 }), // win
    ];
    expect(computeTeamRecentRecord(games)).toEqual({
      wins: 3,
      losses: 2,
      sampleSize: 5,
    });
  });

  it("window(5) 초과분은 무시 — 가장 최근 5경기만 집계", () => {
    const games = [
      game({ gameDate: "2026-07-06", ourScore: 5, opponentScore: 1 }), // win
      game({ gameDate: "2026-07-05", ourScore: 4, opponentScore: 2 }), // win
      game({ gameDate: "2026-07-04", ourScore: 3, opponentScore: 1 }), // win
      game({ gameDate: "2026-07-03", ourScore: 6, opponentScore: 2 }), // win
      game({ gameDate: "2026-07-02", ourScore: 2, opponentScore: 1 }), // win
      // 6번째(가장 오래된) 경기 — window 밖, 패배여도 무시
      game({ gameDate: "2026-07-01", ourScore: 0, opponentScore: 5 }), // loss
    ];
    expect(computeTeamRecentRecord(games)).toEqual({
      wins: 5,
      losses: 0,
      sampleSize: 5,
    });
  });

  it("final 아닌 경기/점수 null 은 집계에서 제외", () => {
    const games = [
      game({ gameDate: "2026-07-06", status: "scheduled", ourScore: null, opponentScore: null }),
      game({ gameDate: "2026-07-05", ourScore: 4, opponentScore: 1 }), // win
      game({ gameDate: "2026-07-04", ourScore: 2, opponentScore: 5 }), // loss
    ];
    expect(computeTeamRecentRecord(games)).toEqual({
      wins: 1,
      losses: 1,
      sampleSize: 2,
    });
  });

  it("무승부는 표본엔 포함되지만 승/패 어느 쪽에도 안 잡힘", () => {
    const games = [
      game({ gameDate: "2026-07-03", ourScore: 3, opponentScore: 3 }), // draw
      game({ gameDate: "2026-07-01", ourScore: 5, opponentScore: 1 }), // win
    ];
    expect(computeTeamRecentRecord(games)).toEqual({
      wins: 1,
      losses: 0,
      sampleSize: 2,
    });
  });
});
