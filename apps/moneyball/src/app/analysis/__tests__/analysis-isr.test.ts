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
  it("analysis/page.tsx revalidate = 3600 magic 부재 — ANALYSIS_INDEX_ISR_SECONDS 사용", () => {
    expect(INDEX_SRC).not.toMatch(/export\s+const\s+revalidate\s*=\s*3600\b/);
    expect(INDEX_SRC).toMatch(
      /export\s+const\s+revalidate\s*=\s*ANALYSIS_INDEX_ISR_SECONDS/,
    );
  });

  it("analysis/page.tsx ANALYSIS_INDEX_ISR_SECONDS @moneyball/shared import 포함", () => {
    expect(INDEX_SRC).toMatch(
      /import\s*\{[^}]*ANALYSIS_INDEX_ISR_SECONDS[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/,
    );
  });

  it("analysis/game/[id]/page.tsx revalidate = 600 magic 부재 — ANALYSIS_GAME_ISR_SECONDS 사용", () => {
    expect(GAME_SRC).not.toMatch(/export\s+const\s+revalidate\s*=\s*600\b/);
    expect(GAME_SRC).toMatch(
      /export\s+const\s+revalidate\s*=\s*ANALYSIS_GAME_ISR_SECONDS/,
    );
  });

  it("analysis/game/[id]/page.tsx ANALYSIS_GAME_ISR_SECONDS @moneyball/shared import 포함", () => {
    expect(GAME_SRC).toMatch(
      /import\s*\{[^}]*ANALYSIS_GAME_ISR_SECONDS[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/,
    );
  });
});
