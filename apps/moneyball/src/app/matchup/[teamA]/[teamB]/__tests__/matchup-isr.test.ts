import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

describe("matchup MATCHUP_ISR_SECONDS source-of-truth guard (silent drift family wave 175 cycle 1425)", () => {
  it("matchup/[teamA]/[teamB]/page.tsx revalidate = 3600 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*3600\b/);
  });
});
