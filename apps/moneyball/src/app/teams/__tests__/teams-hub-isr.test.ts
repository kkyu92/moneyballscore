import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

describe("teams hub ISR source-of-truth guard (wave-297 cycle 1625)", () => {
  it("teams/page.tsx revalidate = 1800 literal (TEAMS_ISR_SECONDS, Next.js 16 Turbopack: literal required)", () => {
    expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*1800\b/);
  });
  it("teams/page.tsx fetches accuracy data (async + buildAllTeamAccuracy)", () => {
    expect(PAGE_SRC).toContain("buildAllTeamAccuracy");
    expect(PAGE_SRC).toContain("async function TeamsIndexPage");
  });
  it("teams/page.tsx uses SMALL_SAMPLE_N for sample hedge", () => {
    expect(PAGE_SRC).toContain("SMALL_SAMPLE_N");
  });
});
