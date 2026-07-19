import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

describe("wave-478: analysis/game/[id] 비수렴 경기 팩터 N:M 균형 배지 (cycle 1840)", () => {
  it("wave-478 badge block exists — !isConvergencePick guard", () => {
    expect(PAGE_SRC).toMatch(/!isConvergencePick\s*&&\s*convergenceDuel\.validCount\s*>=\s*COMPOSITE_DUEL_MIN_VALID/);
  });

  it("wave-478 shows 팩터 균형 label", () => {
    expect(PAGE_SRC).toContain("팩터 균형");
  });

  it("wave-478 isTied branch renders 균형 text (not 우세)", () => {
    expect(PAGE_SRC).toMatch(/isTied\s*=\s*convergenceDuel\.netScore\s*===\s*0/);
    expect(PAGE_SRC).toContain("균형");
  });

  it("wave-478 ratio rendered as 팩터 N:M", () => {
    expect(PAGE_SRC).toContain("팩터 {ratio}");
  });
});
