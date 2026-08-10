import { describe, expect, it } from "vitest";
import { computePitcherTeamRecord } from "../buildPitcherProfile";
import type { PitcherAppearance } from "../buildPitcherProfile";

function appearance(overrides: Partial<PitcherAppearance>): PitcherAppearance {
  return {
    gameId: 1,
    gameDate: "2026-04-01",
    side: "home",
    opponentCode: null,
    opponentName: null,
    fip: null,
    xfip: null,
    predictedSideWin: false,
    isCorrect: null,
    status: "final",
    ourScore: null,
    opponentScore: null,
    ...overrides,
  };
}

describe("computePitcherTeamRecord", () => {
  it("returns null when sample size below threshold (min 2)", () => {
    const appearances: PitcherAppearance[] = [
      appearance({ ourScore: 5, opponentScore: 2 }),
    ];
    expect(computePitcherTeamRecord(appearances)).toBeNull();
  });

  it("counts wins and losses from final games only", () => {
    const appearances: PitcherAppearance[] = [
      appearance({ ourScore: 5, opponentScore: 2 }),
      appearance({ ourScore: 1, opponentScore: 4 }),
      appearance({ ourScore: 3, opponentScore: 1 }),
    ];
    expect(computePitcherTeamRecord(appearances)).toEqual({
      wins: 2,
      losses: 1,
      sampleSize: 3,
    });
  });

  it("excludes non-final and null-score games from the sample", () => {
    const appearances: PitcherAppearance[] = [
      appearance({ ourScore: 5, opponentScore: 2, status: "final" }),
      appearance({ ourScore: null, opponentScore: null, status: "scheduled" }),
      appearance({ ourScore: 3, opponentScore: 1, status: "final" }),
    ];
    expect(computePitcherTeamRecord(appearances)).toEqual({
      wins: 2,
      losses: 0,
      sampleSize: 2,
    });
  });

  it("ignores ties (equal scores)", () => {
    const appearances: PitcherAppearance[] = [
      appearance({ ourScore: 2, opponentScore: 2 }),
      appearance({ ourScore: 5, opponentScore: 2 }),
      appearance({ ourScore: 1, opponentScore: 4 }),
    ];
    expect(computePitcherTeamRecord(appearances)).toEqual({
      wins: 1,
      losses: 1,
      sampleSize: 2,
    });
  });
});
