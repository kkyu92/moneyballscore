import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// cycle 2620 review-code (heavy): uppercase eyebrow/section labels
// (small-caps style headings) consistently use `tracking-wide` across
// the codebase (10 instances: DebateTimeline, AgentVoteCard,
// MlbMatchupFactorCompare, MatchupFactorCompare, MobileNav,
// LeagueSelector, Footer, ConvergenceStreakBadges x2). SearchClient.tsx
// paired `uppercase` with `tracking-wider` instead — same visual role
// (group label heading), single outlier value. Fixed to `tracking-wide`.

const COMPONENTS_DIR = join(__dirname, "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      walk(full, out);
    } else if (entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("silent-drift cycle 2620: uppercase eyebrow-label tracking convention", () => {
  it("no component pairs `uppercase` with `tracking-wider` (established convention is tracking-wide)", () => {
    const offenders: string[] = [];
    for (const file of walk(COMPONENTS_DIR)) {
      const content = readFileSync(file, "utf-8");
      for (const line of content.split("\n")) {
        if (line.includes("uppercase") && line.includes("tracking-wider")) {
          offenders.push(file);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("SearchClient.tsx group label uses tracking-wide", () => {
    const content = readFileSync(join(COMPONENTS_DIR, "search", "SearchClient.tsx"), "utf-8");
    expect(content).toContain("uppercase tracking-wide text-gray-500 dark:text-gray-400");
  });
});
