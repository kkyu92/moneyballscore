import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONVERGENCE_SRC = readFileSync(resolve(__dirname, "../convergenceRecord.ts"), "utf8");
const ANALYSIS_DATA_SRC = readFileSync(
  resolve(__dirname, "../../../app/analysis/analysis-data.ts"),
  "utf8",
);

describe("silent drift cycle 2304 — convergenceRecord.ts evaluateConvergencePickRow h2h 팩터 누락 정정 (cycle 2303 game/[id] family, 집계 차원)", () => {
  it("getSeasonH2HData import 됨", () => {
    expect(CONVERGENCE_SRC).toMatch(/import \{ getSeasonH2HData \} from '@\/app\/analysis\/analysis-data';/);
  });

  it("evaluateConvergencePickRow 가 h2hMap 파라미터를 받음", () => {
    expect(CONVERGENCE_SRC).toMatch(/function evaluateConvergencePickRow\(\s*row: ConvergenceGameRow,\s*minFactors: number,\s*h2hMap: Map<string, Record<string, number>>,/);
  });

  it("computeCompositeDuel 호출에 h2hHomeWins/h2hAwayWins 전달됨", () => {
    const duelCallStart = CONVERGENCE_SRC.indexOf("const duel = computeCompositeDuel({");
    expect(duelCallStart).toBeGreaterThan(-1);
    const duelCallEnd = CONVERGENCE_SRC.indexOf("});", duelCallStart);
    const duelCallBody = CONVERGENCE_SRC.slice(duelCallStart, duelCallEnd);
    expect(duelCallBody).toMatch(/h2hHomeWins:\s*h2hHomeArg/);
    expect(duelCallBody).toMatch(/h2hAwayWins:\s*h2hAwayArg/);
  });

  it("H2H_MIN_GAMES 미달 시 undefined 로 게이팅 (소표본 방지)", () => {
    expect(CONVERGENCE_SRC).toMatch(/h2hTotal >= H2H_MIN_GAMES \? h2hHomeWins : undefined/);
    expect(CONVERGENCE_SRC).toMatch(/h2hTotal >= H2H_MIN_GAMES \? h2hAwayWins : undefined/);
  });

  it("fetchConvergencePickDetailedResults + ForPair 양쪽 모두 h2hMap 조회 후 전달", () => {
    const occurrences = CONVERGENCE_SRC.match(/const h2hMap = await getSeasonH2HData\(\);/g) ?? [];
    expect(occurrences.length).toBe(2);
    expect(CONVERGENCE_SRC).toMatch(/evaluateConvergencePickRow\(row, minFactors, h2hMap\)/);
  });
});

describe("silent drift cycle 2304 — analysis-data.ts getThisWeekRemainingGames computeCompositeDuel 호출에 h2h 팩터 누락 정정", () => {
  it("getSeasonH2HData 를 Promise.all 로 병렬 조회함", () => {
    expect(ANALYSIS_DATA_SRC).toMatch(/const \[scheduleResult, eloResult, h2hMap\] = await Promise\.all\(\[/);
    expect(ANALYSIS_DATA_SRC).toMatch(/getSeasonH2HData\(\),\s*\]\);/);
  });

  it("H2H_MIN_GAMES 미달 시 undefined 로 게이팅", () => {
    expect(ANALYSIS_DATA_SRC).toMatch(/const h2hHomeWins = h2hTotal >= H2H_MIN_GAMES \? h2hHomeWinsRaw : undefined;/);
    expect(ANALYSIS_DATA_SRC).toMatch(/const h2hAwayWins = h2hTotal >= H2H_MIN_GAMES \? h2hAwayWinsRaw : undefined;/);
  });

  it("computeCompositeDuel 호출에 h2hHomeWins/h2hAwayWins 전달됨 (UpcomingScheduledGame 경로)", () => {
    const duelCallStart = ANALYSIS_DATA_SRC.indexOf("const duel = computeCompositeDuel({");
    expect(duelCallStart).toBeGreaterThan(-1);
    const duelCallEnd = ANALYSIS_DATA_SRC.indexOf("});", duelCallStart);
    const duelCallBody = ANALYSIS_DATA_SRC.slice(duelCallStart, duelCallEnd);
    expect(duelCallBody).toMatch(/h2hHomeWins,\s*h2hAwayWins,/);
  });

  it("UpcomingScheduledGame 인터페이스가 h2hHomeWins/h2hAwayWins 필드를 선언함", () => {
    expect(ANALYSIS_DATA_SRC).toMatch(/h2hHomeWins\?: number;\s*h2hAwayWins\?: number;\s*\}/);
  });
});
