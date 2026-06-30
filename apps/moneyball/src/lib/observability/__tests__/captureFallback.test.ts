import { describe, it, expect, vi, beforeEach } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { captureFallback } from "../captureFallback";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("captureFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns fallback when err thrown and calls Sentry.captureException with layer tag", () => {
    const err = new Error("boom");
    const result = captureFallback(err, [], { route: "/", source: "buildStandings" });
    expect(result).toEqual([]);
    expect(Sentry.captureException).toHaveBeenCalledWith(err, {
      tags: { layer: "page-fallback", route: "/", source: "buildStandings" },
    });
  });

  it("preserves caller tags alongside layer=page-fallback", () => {
    captureFallback(new Error("x"), null, { route: "/players/[id]", source: "buildPitcherProfile" });
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      {
        tags: {
          layer: "page-fallback",
          route: "/players/[id]",
          source: "buildPitcherProfile",
        },
      },
    );
  });

  it("returns fallback object reference unchanged", () => {
    const fallback = { points: [], teams: [] };
    const result = captureFallback(new Error("x"), fallback, { route: "/standings", source: "buildEloTrend" });
    expect(result).toBe(fallback);
  });
});
