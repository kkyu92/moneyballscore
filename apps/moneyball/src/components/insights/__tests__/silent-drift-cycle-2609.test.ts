import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// cycle 2609 polish-ui: AgentVoteCard.tsx awayColor fallback hardcoded the
// "away team orange" hex ("#c5872a") as an inline literal, duplicating a
// value already defined once as --color-away in globals.css and referenced
// via var(--color-away) in 10+ other files (insights/page.tsx,
// about/page.tsx, PostviewPanel.tsx, AgentArgumentBox.tsx, GameOverview.tsx,
// FactorBreakdown.tsx, RivalryMemorySurface.tsx x2, DetailedFactorAnalysis.tsx
// x2, MlbRivalryMemorySurface.tsx, MlbDetailedFactorAnalysis.tsx). A future
// globals.css palette change would silently desync this one component.
// Fixed to reference var(--color-away) like every other consumer.

const INSIGHTS_DIR = join(__dirname, "..");
const SRC_ROOT = join(__dirname, "..", "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      walk(full, out);
    } else if (entry.endsWith(".tsx") || entry.endsWith(".ts") || entry.endsWith(".css")) {
      out.push(full);
    }
  }
  return out;
}

describe("silent-drift-cycle-2609: --color-away referenced via var(), not duplicated as a literal hex", () => {
  it("AgentVoteCard awayColor fallback uses var(--color-away)", () => {
    const content = readFileSync(join(INSIGHTS_DIR, "AgentVoteCard.tsx"), "utf-8");
    expect(content).toContain('"var(--color-away)"');
    expect(content).not.toContain("#c5872a");
  });

  it("no source file outside globals.css hardcodes the away-orange hex literal", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC_ROOT)) {
      if (file.endsWith("globals.css")) continue;
      const content = readFileSync(file, "utf-8");
      if (content.includes("#c5872a")) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
