import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

describe("standings 홈/원정 성적 컬럼 guard (cycle 2535 explore-idea — homeWins/homeLosses fetched but never rendered)", () => {
  it("StandingRow.homeWins/homeLosses 를 테이블에 렌더한다 (HomeAwayRecord)", () => {
    expect(PAGE_SRC).toMatch(/homeWins=\{row\.homeWins\}/);
    expect(PAGE_SRC).toMatch(/homeLosses=\{row\.homeLosses\}/);
  });

  it("VENUE_RECORD_MIN_GAMES 표본 가드를 재사용한다 (analysis/page.tsx wave-329/434 와 동일 threshold)", () => {
    expect(PAGE_SRC).toMatch(/VENUE_RECORD_MIN_GAMES/);
  });
});
