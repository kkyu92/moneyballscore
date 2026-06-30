import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

describe("reviews/weekly/[week]/page.tsx SMALL_SAMPLE_N source-of-truth guard (cycle 905 sweep 52)", () => {
  it("predicted < 5 hardcoded 부재 — SMALL_SAMPLE_N import 사용", () => {
    expect(PAGE_SRC).not.toMatch(/predicted\s*<\s*5\b/);
  });

  it("hedge label 자연어 '(5경기 이상부터' hardcoded 부재 — ${SMALL_SAMPLE_N}경기 사용", () => {
    expect(PAGE_SRC).not.toMatch(/\(5경기 이상부터/);
    expect(PAGE_SRC).toMatch(/\$\{SMALL_SAMPLE_N\}경기 이상부터/);
  });
});
