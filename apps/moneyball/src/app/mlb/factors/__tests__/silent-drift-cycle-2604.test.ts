import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// cycle 2604 review-code(heavy): final cleanup of rounded-md(6px) literal.
// DESIGN.md tier names don't line up with Tailwind's own rounded-{size} suffixes
// (sm->`rounded`, md->`rounded-lg`, lg->`rounded-xl`, xl->`rounded-2xl`) so any
// `rounded-md` literal is drift by construction. 25 button/input/badge/notice-box/
// calendar-cell instances aligned to `rounded-lg` (md tier, 8px). 3 large-dropdown
// -panel instances (MegaMenu / navigation-menu viewport / SearchClient row-hover)
// explicitly deferred — tier (button vs card) unclear without a twin.
const APP_ROOT = join(__dirname, "..", "..", "..", "..", "..");
const SRC_ROOT = join(APP_ROOT, "src");

function read(rel: string) {
  return readFileSync(join(APP_ROOT, rel), "utf-8");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (/\.(tsx|ts)$/.test(entry) && !entry.includes(".test.")) {
      out.push(full);
    }
  }
  return out;
}

const DEFERRED_FILES = [
  "src/components/layout/MegaMenu.tsx",
  "src/components/ui/navigation-menu.tsx",
  "src/components/search/SearchClient.tsx",
];

describe("silent-drift-cycle-2604: remaining rounded-md -> rounded-lg (md tier)", () => {
  it("no rounded-md literal survives outside the 3 documented deferred files", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC_ROOT)) {
      const rel = "src" + file.slice(SRC_ROOT.length);
      if (DEFERRED_FILES.some((d) => rel.replace(/\\/g, "/") === d)) continue;
      const content = readFileSync(file, "utf-8");
      if (content.includes("rounded-md")) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it("deferred files still use rounded-md (scope-out documented, not silently fixed)", () => {
    for (const rel of DEFERRED_FILES) {
      expect(read(rel)).toMatch(/rounded-md/);
    }
  });

  it("MLB analysis/games hub link buttons use rounded-lg", () => {
    for (const rel of [
      "src/app/mlb/analysis/page.tsx",
      "src/app/en/mlb/analysis/page.tsx",
      "src/app/mlb/games/[date]/page.tsx",
      "src/app/en/mlb/games/[date]/page.tsx",
    ]) {
      const content = read(rel);
      const lines = content
        .split("\n")
        .filter((l) => l.includes("MLB 분석 hub") || l.includes("MLB Analysis Hub") || l.includes("자신감 픽") || l.includes("Top pick"));
      expect(lines.length).toBeGreaterThan(0);
    }
    expect(read("src/app/mlb/analysis/page.tsx")).toMatch(/items-center gap-1 rounded-lg border border-brand-300/);
    expect(read("src/app/mlb/games/[date]/page.tsx")).toMatch(/items-center gap-2 rounded-lg border border-brand-400/);
  });

  it("calendar day cells (KBO + MLB mirrors) use rounded-lg", () => {
    for (const rel of [
      "src/app/calendar/page.tsx",
      "src/app/mlb/calendar/page.tsx",
      "src/app/en/mlb/calendar/page.tsx",
    ]) {
      const content = read(rel);
      expect(content).toMatch(/aspect-square rounded-lg/);
      expect(content).not.toMatch(/aspect-square rounded-md/);
    }
  });

  it("v2-shadow-monitor sections align with matchup table-wrapper twin (rounded-lg)", () => {
    const content = read("src/app/v2-shadow-monitor/page.tsx");
    expect(content).not.toMatch(/rounded-md/);
    expect(content).toMatch(/overflow-x-auto rounded-lg border border-brand-200/);

    const twin = read("src/app/matchup/[teamA]/[teamB]/page.tsx");
    expect(twin).toMatch(/overflow-x-auto rounded-lg border/);
  });
});
