// wave-610: /matchup/[teamA]/[teamB] 맞대결 최근 연승/연패 스트릭
// 맞대결 경기 기록(games)은 이미 있었지만 "최근 이 맞대결에서 누가 몇 연승 중인지"는
// 요약 문장에 없던 gap. computeMatchupStreak — 신규 DB 조회 없이 buildMatchupProfile
// 이 이미 조회한 games 배열(game_date 내림차순)만으로 순수 계산, buildSummary 문장에 편입.

import { describe, it, expect } from "vitest";
import {
  computeMatchupStreak,
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

describe("wave-610: computeMatchupStreak", () => {
  it("final 경기 없으면 null", () => {
    expect(computeMatchupStreak([])).toBeNull();
    expect(
      computeMatchupStreak([game({ status: "scheduled", actualWinnerCode: null })]),
    ).toBeNull();
  });

  it("가장 최근 경기가 무승부(승자 없음)면 null", () => {
    const games = [
      game({ gameDate: "2026-07-03", actualWinnerCode: null }),
      game({ gameDate: "2026-07-01", actualWinnerCode: "LG" }),
    ];
    expect(computeMatchupStreak(games)).toBeNull();
  });

  it("1승만으론 스트릭 아님 (최소 길이 2)", () => {
    const games = [
      game({ gameDate: "2026-07-03", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-01", actualWinnerCode: "KT" }),
    ];
    expect(computeMatchupStreak(games)).toBeNull();
  });

  it("최근 3연승 감지 (내림차순 입력 그대로)", () => {
    const games = [
      game({ gameDate: "2026-07-05", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-03", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-01", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-06-28", actualWinnerCode: "KT" }),
    ];
    expect(computeMatchupStreak(games)).toEqual({ teamCode: "LG", length: 3 });
  });

  it("예정 경기(scheduled, 미래 날짜)가 배열 앞쪽에 있어도 final 만 필터해 정상 계산", () => {
    const games = [
      game({ gameDate: "2026-08-01", status: "scheduled", actualWinnerCode: null }),
      game({ gameDate: "2026-07-05", actualWinnerCode: "KT" }),
      game({ gameDate: "2026-07-03", actualWinnerCode: "KT" }),
      game({ gameDate: "2026-07-01", actualWinnerCode: "LG" }),
    ];
    expect(computeMatchupStreak(games)).toEqual({ teamCode: "KT", length: 2 });
  });

  it("스트릭 도중 무승부가 끊음 (연승 중간 draw 는 별개 스트릭으로 합산하지 않음)", () => {
    const games = [
      game({ gameDate: "2026-07-05", actualWinnerCode: "LG" }),
      game({ gameDate: "2026-07-03", actualWinnerCode: null }),
      game({ gameDate: "2026-07-01", actualWinnerCode: "LG" }),
    ];
    expect(computeMatchupStreak(games)).toBeNull();
  });
});
