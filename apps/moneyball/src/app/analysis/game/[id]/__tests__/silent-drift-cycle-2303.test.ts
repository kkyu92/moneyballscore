import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

describe("silent drift cycle 2303 — analysis/game/[id]/page.tsx computeCompositeDuel 호출에 h2h 팩터 누락 정정", () => {
  it("getSeasonH2HData import 됨 (analysis/page.tsx list 와 동일 source)", () => {
    expect(PAGE_SRC).toMatch(/import \{ getSeasonH2HData \} from '@\/app\/analysis\/analysis-data';/);
  });

  it("H2H_MIN_GAMES import 됨", () => {
    expect(PAGE_SRC).toMatch(/H2H_MIN_GAMES,/);
  });

  it("h2h pair key 구성 — list page(wave-333) 와 동일 sort+join 패턴", () => {
    expect(PAGE_SRC).toMatch(/\[homeTeam as string, awayTeam as string\]\.sort\(\)/);
    expect(PAGE_SRC).toMatch(/h2hMap\.get\(`\$\{h2hA\}:\$\{h2hB\}`\)/);
  });

  it("H2H_MIN_GAMES 미달 시 undefined 로 게이팅 (소표본 방지)", () => {
    expect(PAGE_SRC).toMatch(/h2hTotal >= H2H_MIN_GAMES \? h2hHomeWins : undefined/);
    expect(PAGE_SRC).toMatch(/h2hTotal >= H2H_MIN_GAMES \? h2hAwayWins : undefined/);
  });

  it("computeCompositeDuel 호출에 h2hHomeWins/h2hAwayWins 전달됨", () => {
    const duelCallStart = PAGE_SRC.indexOf("const convergenceDuel = computeCompositeDuel({");
    expect(duelCallStart).toBeGreaterThan(-1);
    const duelCallEnd = PAGE_SRC.indexOf("});", duelCallStart);
    const duelCallBody = PAGE_SRC.slice(duelCallStart, duelCallEnd);
    expect(duelCallBody).toMatch(/h2hHomeWins:\s*h2hHomeArg/);
    expect(duelCallBody).toMatch(/h2hAwayWins:\s*h2hAwayArg/);
  });
});
