import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// cycle 3230 review-code (heavy): LiveScoreboard's three brand pill badges
// ("승" away-win, "홈" home, "승" home-win) used dark:bg-brand-900/50 while
// every other sibling brand pill in the codebase (MiniGameCard, PredictionCard,
// PlaceholderCard, PickButton, MyPicksClient, WeeklyPicksSummary, AgentVoteCard,
// ModelVersionHistory, HistoricalAnalogMatchup, MlbHistoricalAnalogMatchup) uses
// dark:bg-brand-900/40. Aligned to the shared convention.

const LIVE_DIR = join(__dirname, "..");

describe("silent-drift-cycle-3230: LiveScoreboard brand pill opacity matches sibling convention", () => {
  it("has no dark:bg-brand-900/50 outlier — all brand pills use /40", () => {
    const content = readFileSync(join(LIVE_DIR, "LiveScoreboard.tsx"), "utf-8");
    expect(content).not.toContain("dark:bg-brand-900/50");
    const matches = content.match(/dark:bg-brand-900\/40/g) ?? [];
    expect(matches.length).toBe(3);
  });
});
