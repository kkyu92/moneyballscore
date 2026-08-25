import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// cycle 2602 review-code(heavy): badge/pill role rounded-md(6px) → rounded(4px)
// DESIGN.md 뱃지/태그 tier = sm(4px). analysis/page.tsx isComplete/isBig 배지 기존
// 컨벤션(plain "rounded")과 정렬 — MLB factors/players/standings 통계 뱃지 +
// glossary/ToC 앵커 태그 + matchup 비교 셀 18곳.
const TOUCHED_FILES = [
  "src/app/glossary/page.tsx",
  "src/components/shared/TableOfContents.tsx",
  "src/app/en/mlb/players/page.tsx",
  "src/app/en/mlb/players/[id]/page.tsx",
  "src/app/en/mlb/factors/page.tsx",
  "src/app/en/mlb/standings/page.tsx",
  "src/app/mlb/players/page.tsx",
  "src/app/mlb/standings/page.tsx",
  "src/app/mlb/players/[id]/page.tsx",
  "src/app/mlb/factors/page.tsx",
  "src/components/matchup/MatchupFactorCompare.tsx",
  "src/components/matchup/MlbMatchupFactorCompare.tsx",
];

const APP_ROOT = join(__dirname, "..", "..", "..", "..", "..");

describe("silent-drift-cycle-2602: badge rounded-md -> rounded", () => {
  it("factors/players/standings stat badges use plain rounded, not rounded-md", () => {
    const content = readFileSync(
      join(APP_ROOT, "src/app/mlb/factors/page.tsx"),
      "utf-8"
    );
    // px-3 py-2 note box (line ~288) intentionally kept rounded-md (different role, out of scope)
    const badgeLines = content
      .split("\n")
      .filter((l) => l.includes("px-2 py-0.5") && l.includes("font-mono"));
    expect(badgeLines.length).toBeGreaterThan(0);
    for (const line of badgeLines) {
      expect(line).not.toMatch(/rounded-md/);
      expect(line).toMatch(/\brounded\b(?!-)/);
    }
  });

  it("touched files no longer contain rounded-md on the fixed badge lines", () => {
    for (const rel of TOUCHED_FILES) {
      const content = readFileSync(join(APP_ROOT, rel), "utf-8");
      const pillLines = content
        .split("\n")
        .filter(
          (l) =>
            (l.includes("px-2 py-1") ||
              l.includes("px-2 py-0.5") ||
              l.includes("px-2.5 py-1")) &&
            (l.includes("text-xs") || l.includes("font-mono"))
        );
      for (const line of pillLines) {
        expect(line).not.toMatch(/rounded-md/);
      }
    }
  });
});
