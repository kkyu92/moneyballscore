import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
const GAME_SRC = readFileSync(
  resolve(__dirname, "../game/[id]/page.tsx"),
  "utf8",
);

describe("analysis ANALYSIS_*_ISR_SECONDS source-of-truth guard (silent drift wave 134 cycle 1356)", () => {
  it("analysis/page.tsx revalidate = 3600 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(INDEX_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*3600\b/);
    // build guard: route segment revalidate must be literal not identifier (Next.js 16 Turbopack)
  });

  it("analysis/game/[id]/page.tsx revalidate = 600 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(GAME_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*600\b/);
    // build guard: route segment revalidate must be literal not identifier (Next.js 16 Turbopack)
  });

});
