import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// cycle 2621 review-code (heavy): LiveScoreboard's "홈" (home team) badge is
// the same role as the identical aria-label="홈팀" badge in MiniGameCard.tsx /
// PredictionCard.tsx / PlaceholderCard.tsx (text-3xs, font-bold, brand pill).
// LiveScoreboard alone used font-semibold. Aligned to the shared convention.

const LIVE_DIR = join(__dirname, "..");

describe("silent-drift-cycle-2621: LiveScoreboard 홈 badge weight matches sibling components", () => {
  it("home badge uses font-bold, not font-semibold", () => {
    const content = readFileSync(join(LIVE_DIR, "LiveScoreboard.tsx"), "utf-8");
    expect(content).toContain(
      'rounded text-3xs font-bold bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 leading-none"\n            aria-label="홈팀"'
    );
    expect(content).not.toContain("text-3xs font-semibold");
  });
});
