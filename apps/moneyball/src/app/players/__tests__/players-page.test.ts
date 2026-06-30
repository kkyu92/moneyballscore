import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

const ID_PAGE_SRC = readFileSync(resolve(__dirname, "../[id]/page.tsx"), "utf8");

describe("players/page.tsx SMALL_SAMPLE_N source-of-truth guard (cycle 902 sweep 51)", () => {
  it("local SMALL_SAMPLE_N 선언 부재 — @moneyball/shared import 만 사용", () => {
    expect(PAGE_SRC).not.toMatch(/const\s+SMALL_SAMPLE_N\s*=/);
  });

  it("verifiedN < 5 hardcoded 부재 — SMALL_SAMPLE_N 사용", () => {
    expect(PAGE_SRC).not.toMatch(/verifiedN\s*<\s*5\b/);
  });
});

describe("players PLAYERS_ISR_SECONDS source-of-truth guard (silent drift wave 126 cycle 1345)", () => {
  it("players/page.tsx revalidate = 1800 magic 부재 — PLAYERS_ISR_SECONDS 사용", () => {
        expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*1800\b/) // build guard: literal required;
  });

  it("players/[id]/page.tsx revalidate = 1800 magic 부재 — PLAYERS_ISR_SECONDS 사용", () => {
        expect(ID_PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*1800\b/) // build guard: literal required;
  });

});
