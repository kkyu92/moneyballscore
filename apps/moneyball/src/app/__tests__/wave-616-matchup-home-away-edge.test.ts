// wave-616: /matchup/[teamA]/[teamB] 홈/원정 편중
// 팀별 성과 카드에 홈/원정 승수는 있었지만(wave 이전) 벤뉴별 표본(경기 수) 은
// 계산하지 않아 "편중이 뚜렷한지" 판정은 없던 gap.
// computeMatchupHomeAwayEdge — 신규 DB 조회 없이 buildMatchupProfile 이 이미
// 조회한 games 배열만으로 순수 계산, buildSummary 문장에 편입.

import { describe, it, expect } from "vitest";
import {
  computeMatchupHomeAwayEdge,
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

describe("wave-616: computeMatchupHomeAwayEdge", () => {
  it("경기 없으면 null", () => {
    expect(computeMatchupHomeAwayEdge([], "LG", "KT")).toBeNull();
  });

  it("한 벤뉴 표본 부족(최소 2경기)이면 null", () => {
    const games = [
      game({ gameDate: "2026-07-03", homeCode: "LG", awayCode: "KT", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-02", homeCode: "LG", awayCode: "KT", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-01", homeCode: "KT", awayCode: "LG", actualWinnerCode: "LG" }),
    ];
    // LG: home 2경기, away 1경기 → away 표본 부족
    expect(computeMatchupHomeAwayEdge(games, "LG", "KT")).toBeNull();
  });

  it("홈/원정 승률 차이 뚜렷(>=40%p)하면 해당 팀 반환", () => {
    const games = [
      game({ gameDate: "2026-07-06", homeCode: "LG", awayCode: "KT", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-05", homeCode: "LG", awayCode: "KT", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-04", homeCode: "KT", awayCode: "LG", actualWinnerCode: "KT" }),
      game({ gameDate: "2026-07-03", homeCode: "KT", awayCode: "LG", actualWinnerCode: "KT" }),
    ];
    // LG: home 2/2 (100%), away 0/2 (0%) → gap 100%p
    expect(computeMatchupHomeAwayEdge(games, "LG", "KT")).toEqual({
      teamCode: "LG",
      homeWins: 2,
      homeGames: 2,
      awayWins: 0,
      awayGames: 2,
    });
  });

  it("승률 차이가 임계 미만(<40%p)이면 null", () => {
    const games = [
      game({ gameDate: "2026-07-06", homeCode: "LG", awayCode: "KT", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-05", homeCode: "LG", awayCode: "KT", actualWinnerCode: "KT" }),
      game({ gameDate: "2026-07-04", homeCode: "KT", awayCode: "LG", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-03", homeCode: "KT", awayCode: "LG", actualWinnerCode: "KT" }),
    ];
    // LG: home 1/2 (50%), away 1/2 (50%) → gap 0%p
    expect(computeMatchupHomeAwayEdge(games, "LG", "KT")).toBeNull();
  });

  it("final 아닌 경기(예정)는 표본에서 제외", () => {
    const games = [
      game({ gameDate: "2026-07-08", status: "scheduled", homeCode: "LG", awayCode: "KT", homeScore: null, awayScore: null }),
      game({ gameDate: "2026-07-06", homeCode: "LG", awayCode: "KT", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-05", homeCode: "LG", awayCode: "KT", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-04", homeCode: "KT", awayCode: "LG", actualWinnerCode: "KT" }),
      game({ gameDate: "2026-07-03", homeCode: "KT", awayCode: "LG", actualWinnerCode: "KT" }),
    ];
    expect(computeMatchupHomeAwayEdge(games, "LG", "KT")).toEqual({
      teamCode: "LG",
      homeWins: 2,
      homeGames: 2,
      awayWins: 0,
      awayGames: 2,
    });
  });

  it("무승부(승자 없음)도 벤뉴 표본엔 포함되지만 승수엔 미반영", () => {
    const games = [
      game({ gameDate: "2026-07-06", homeCode: "LG", awayCode: "KT", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-05", homeCode: "LG", awayCode: "KT", actualWinnerCode: null }),
      game({ gameDate: "2026-07-04", homeCode: "KT", awayCode: "LG", actualWinnerCode: "KT" }),
      game({ gameDate: "2026-07-03", homeCode: "KT", awayCode: "LG", actualWinnerCode: "KT" }),
    ];
    // LG: home 1/2 (50%), away 0/2 (0%) → gap 50%p
    // KT: home 2/2 (100%), away 0/2 (0%, 무승부 미반영) → gap 100%p, LG 보다 커서 KT 선택
    expect(computeMatchupHomeAwayEdge(games, "LG", "KT")).toEqual({
      teamCode: "KT",
      homeWins: 2,
      homeGames: 2,
      awayWins: 0,
      awayGames: 2,
    });
  });

  it("두 팀 모두 조건 충족 시 격차가 더 큰 쪽만 반환", () => {
    const games = [
      // LG 홈 4경기 전승 → LG 홈 100%, KT 원정 0%
      game({ gameDate: "2026-07-04", homeCode: "LG", awayCode: "KT", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-03", homeCode: "LG", awayCode: "KT", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-02", homeCode: "LG", awayCode: "KT", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-01", homeCode: "LG", awayCode: "KT", actualWinnerCode: "LG" }),
      // KT 홈 4경기 중 2승 1패 1무 → KT 홈 50%, LG 원정 25% (무승부가 대칭 깨짐)
      game({ gameDate: "2026-07-08", homeCode: "KT", awayCode: "LG", actualWinnerCode: "KT" }),
      game({ gameDate: "2026-07-07", homeCode: "KT", awayCode: "LG", actualWinnerCode: "KT" }),
      game({ gameDate: "2026-07-06", homeCode: "KT", awayCode: "LG", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-05", homeCode: "KT", awayCode: "LG", actualWinnerCode: null }),
    ];
    // LG: home 4/4 (100%), away 1/4 (25%) → gap 75%p
    // KT: home 2/4 (50%), away 0/4 (0%) → gap 50%p (둘 다 임계 충족이지만 LG 격차가 더 큼)
    expect(computeMatchupHomeAwayEdge(games, "LG", "KT")).toEqual({
      teamCode: "LG",
      homeWins: 4,
      homeGames: 4,
      awayWins: 1,
      awayGames: 4,
    });
  });
});
