import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// cycle 2619 review-code (heavy): the established 2-tier muted-text
// convention inverts the Tailwind gray shade between light/dark mode
// so the two tiers keep an equivalent contrast level:
//   tier 1 (primary muted):   text-gray-500 dark:text-gray-400
//   tier 2 (secondary muted): text-gray-400 dark:text-gray-500
// components/picks/{UserVsAIScorecard,WeeklyPicksSummary,MyPicksClient,
// PickButton}.tsx had 9 tier-2 spots pairing `text-gray-400` with a flat
// `dark:text-gray-400` (no invert) instead of `dark:text-gray-500` —
// same visual role as sibling lines in the same files that inverted
// correctly. In dark mode these spots rendered brighter than intended,
// matching tier-1 contrast instead of tier-2. Fixed to invert.

const PICKS_DIR = join(__dirname, "..");

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

describe("silent-drift-cycle-2619: picks/ muted-text tier-2 inverts gray-400/gray-500 across light/dark", () => {
  it("no picks/ source file pairs text-gray-400 with a flat dark:text-gray-400", () => {
    const offenders: string[] = [];
    for (const file of walk(PICKS_DIR)) {
      const content = readFileSync(file, "utf-8");
      if (content.includes("text-gray-400 dark:text-gray-400")) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("UserVsAIScorecard tier-2 caption inverts to dark:text-gray-500", () => {
    const content = readFileSync(join(PICKS_DIR, "UserVsAIScorecard.tsx"), "utf-8");
    expect(content).toContain("text-xs text-gray-400 dark:text-gray-500\">로컬 저장 · 로그인 불필요");
  });

  it("WeeklyPicksSummary rate-percent caption inverts to dark:text-gray-500", () => {
    const content = readFileSync(join(PICKS_DIR, "WeeklyPicksSummary.tsx"), "utf-8");
    const matches = content.match(/text-sm font-normal text-gray-400 dark:text-gray-500/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it("MyPicksClient StatCard sub-caption inverts to dark:text-gray-500", () => {
    const content = readFileSync(join(PICKS_DIR, "MyPicksClient.tsx"), "utf-8");
    expect(content).toContain('{sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}');
  });

  it("PickButton community-pick label and myPick label invert to dark:text-gray-500", () => {
    const content = readFileSync(join(PICKS_DIR, "PickButton.tsx"), "utf-8");
    expect(content).toContain("flex items-center justify-between text-xs text-gray-400 dark:text-gray-500");
    expect(content).toContain('text-xs text-gray-400 dark:text-gray-500 shrink-0">{t.myPick}');
  });
});
