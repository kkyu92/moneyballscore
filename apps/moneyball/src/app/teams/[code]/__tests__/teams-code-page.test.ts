import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

describe("teams/[code]/page.tsx SMALL_SAMPLE_N source-of-truth guard (cycle 902 sweep 51)", () => {
  it("verifiedN < 5 hardcoded 부재 — SMALL_SAMPLE_N import 사용", () => {
    expect(PAGE_SRC).not.toMatch(/verifiedN\s*<\s*5\b/);
  });

  it("SMALL_SAMPLE_N @moneyball/shared import 포함", () => {
    expect(PAGE_SRC).toMatch(/import\s*\{[^}]*SMALL_SAMPLE_N[^}]*\}\s*from\s*['"]@moneyball\/shared['"]/);
  });

  it("SMALL_SAMPLE_N 사용 instance ≥ 3 (소표본 hedge 임계 3 위치)", () => {
    const matches = PAGE_SRC.match(/SMALL_SAMPLE_N/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it("hedge label 자연어 '5경기' hardcoded 부재 — ${SMALL_SAMPLE_N}경기 사용", () => {
    expect(PAGE_SRC).not.toMatch(/\(5경기 이상부터/);
    expect(PAGE_SRC).toMatch(/\$\{SMALL_SAMPLE_N\}경기 이상부터/);
  });
});
