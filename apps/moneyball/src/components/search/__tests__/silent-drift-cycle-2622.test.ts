import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// cycle 2622 review-code (heavy): interactive row/button hover states pair
// `hover:bg-gray-50` with `dark:hover:bg-gray-800` sitewide (8 instances:
// LeaderboardTable, LeaderboardJoinModal, SearchClient group items, etc).
// SearchClient.tsx's search-result row link paired `hover:bg-gray-50`
// with `dark:hover:bg-gray-900/40` instead — same visual role (hover
// state on a clickable row), single outlier value. Fixed to gray-800/40.

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

describe("silent-drift cycle 2622: hover:bg-gray-50 dark hover pairing convention", () => {
  it("no component pairs `hover:bg-gray-50` with `dark:hover:bg-gray-900` (established convention is gray-800)", () => {
    const offenders: string[] = [];
    for (const file of walk(COMPONENTS_DIR)) {
      const content = readFileSync(file, "utf-8");
      for (const line of content.split("\n")) {
        if (line.includes("hover:bg-gray-50") && line.includes("dark:hover:bg-gray-900")) {
          offenders.push(file);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("SearchClient.tsx result row hover uses dark:hover:bg-gray-800/40", () => {
    const content = readFileSync(join(COMPONENTS_DIR, "search", "SearchClient.tsx"), "utf-8");
    expect(content).toContain("hover:bg-gray-50 dark:hover:bg-gray-800/40");
  });
});
