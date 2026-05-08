import { describe, expect, it } from "vitest";
import { buildPitcherFipTrend } from "../buildPitcherFipTrend";
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

describe("buildPitcherFipTrend", () => {
  it("returns empty when recent is empty", () => {
    expect(buildPitcherFipTrend([])).toEqual([]);
  });

  it("filters out appearances with null fip", () => {
    const recent: PitcherAppearance[] = [
      appearance({ gameDate: "2026-04-10", fip: 3.5, xfip: 3.8 }),
      appearance({ gameDate: "2026-04-15", fip: null, xfip: 4.0 }),
      appearance({ gameDate: "2026-04-20", fip: 2.9, xfip: null }),
    ];
    const result = buildPitcherFipTrend(recent);
    expect(result).toHaveLength(2);
    expect(result.every((p) => Number.isFinite(p.fip))).toBe(true);
  });

  it("sorts ascending by date regardless of input order", () => {
    const recent: PitcherAppearance[] = [
      appearance({ gameDate: "2026-04-20", fip: 2.9 }),
      appearance({ gameDate: "2026-04-10", fip: 3.5 }),
      appearance({ gameDate: "2026-04-15", fip: 3.2 }),
    ];
    const result = buildPitcherFipTrend(recent);
    expect(result.map((p) => p.date)).toEqual([
      "2026-04-10",
      "2026-04-15",
      "2026-04-20",
    ]);
  });

  it("preserves nullable xfip", () => {
    const recent: PitcherAppearance[] = [
      appearance({ gameDate: "2026-04-10", fip: 3.5, xfip: null }),
      appearance({ gameDate: "2026-04-12", fip: 3.0, xfip: 3.4 }),
    ];
    const result = buildPitcherFipTrend(recent);
    expect(result[0].xfip).toBeNull();
    expect(result[1].xfip).toBe(3.4);
  });
});
