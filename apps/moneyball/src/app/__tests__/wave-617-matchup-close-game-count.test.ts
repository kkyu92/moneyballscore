// wave-617: /matchup/[teamA]/[teamB] 박빙 승부(한 점차) 횟수
// 콜드게임(wave-614)은 대량 득점차 빈도를 잡았지만 반대로 "얼마나 팽팽했는지"
// 빈도는 없던 gap. computeMatchupCloseGameCount — computeMatchupBlowoutCount 의
// 대칭 지표. 신규 DB 조회 없이 buildMatchupProfile 이 이미 조회한 games 배열만으로
// 순수 계산, buildSummary 문장에 편입.

import { describe, it, expect } from "vitest";
import {
  computeMatchupCloseGameCount,
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

describe("wave-617: computeMatchupCloseGameCount", () => {
  it("final 경기 없으면 null", () => {
    expect(computeMatchupCloseGameCount([])).toBeNull();
  });

  it("2경기만으론 표본 부족으로 null (최소 3경기)", () => {
    const games = [
      game({ gameDate: "2026-07-03", homeScore: 4, awayScore: 3 }),
      game({ gameDate: "2026-07-01", homeScore: 3, awayScore: 2 }),
    ];
    expect(computeMatchupCloseGameCount(games)).toBeNull();
  });

  it("점수 null 인 경기(예정 경기 등)는 표본에서 제외", () => {
    const games = [
      game({ gameDate: "2026-07-07", homeScore: null, awayScore: null, status: "scheduled" }),
      game({ gameDate: "2026-07-05", homeScore: 4, awayScore: 3 }), // margin 1
      game({ gameDate: "2026-07-03", homeScore: 4, awayScore: 2 }), // margin 2
      game({ gameDate: "2026-07-01", homeScore: 3, awayScore: 1 }), // margin 2
    ];
    expect(computeMatchupCloseGameCount(games)).toEqual({
      count: 1,
      sampleSize: 3,
    });
  });

  it("정확히 1점차만 카운트 (===, 콜드게임과 달리 이상 아님)", () => {
    const games = [
      game({ gameDate: "2026-07-05", homeScore: 4, awayScore: 3 }), // margin 1
      game({ gameDate: "2026-07-03", homeScore: 4, awayScore: 2 }), // margin 2
      game({ gameDate: "2026-07-01", homeScore: 12, awayScore: 1 }), // margin 11
    ];
    expect(computeMatchupCloseGameCount(games)).toEqual({
      count: 1,
      sampleSize: 3,
    });
  });

  it("승패 방향(홈/원정) 무관하게 절대값 마진으로 판정", () => {
    const games = [
      game({ gameDate: "2026-07-05", homeCode: "LG", awayCode: "KT", homeScore: 1, awayScore: 2 }), // margin 1
      game({ gameDate: "2026-07-03", homeCode: "KT", awayCode: "LG", homeScore: 2, awayScore: 1 }), // margin 1
      game({ gameDate: "2026-07-01", homeCode: "LG", awayCode: "KT", homeScore: 5, awayScore: 2 }), // margin 3
    ];
    expect(computeMatchupCloseGameCount(games)).toEqual({
      count: 2,
      sampleSize: 3,
    });
  });

  it("final 아닌 경기(진행중/예정)는 제외하고 final 만 집계", () => {
    const games = [
      game({ gameDate: "2026-07-07", status: "scheduled", homeScore: null, awayScore: null }),
      game({ gameDate: "2026-07-05", status: "final", homeScore: 2, awayScore: 1 }), // margin 1
      game({ gameDate: "2026-07-03", status: "final", homeScore: 3, awayScore: 0 }), // margin 3
      game({ gameDate: "2026-07-01", status: "final", homeScore: 2, awayScore: 1 }), // margin 1
    ];
    expect(computeMatchupCloseGameCount(games)).toEqual({
      count: 2,
      sampleSize: 3,
    });
  });

  it("박빙 승부 0건이어도 sampleSize 는 정상 반환 (count=0)", () => {
    const games = [
      game({ gameDate: "2026-07-03", homeScore: 4, awayScore: 1 }), // margin 3
      game({ gameDate: "2026-07-02", homeScore: 5, awayScore: 1 }), // margin 4
      game({ gameDate: "2026-07-01", homeScore: 3, awayScore: 0 }), // margin 3
    ];
    expect(computeMatchupCloseGameCount(games)).toEqual({
      count: 0,
      sampleSize: 3,
    });
  });
});
