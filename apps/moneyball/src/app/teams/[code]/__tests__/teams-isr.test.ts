import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
const RECENT_SRC = readFileSync(resolve(__dirname, "../recent/page.tsx"), "utf8");

describe("teams TEAMS_ISR_SECONDS source-of-truth guard (silent drift family wave 156 cycle 1388)", () => {
  it("teams/[code]/page.tsx revalidate = 1800 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*1800\b/);
  });

  it("teams/[code]/recent/page.tsx revalidate = 1800 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(RECENT_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*1800\b/);
  });

});
