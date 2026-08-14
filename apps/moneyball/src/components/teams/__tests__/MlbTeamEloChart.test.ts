import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dirname, "../MlbTeamEloChart.tsx"), "utf8");

describe("MlbTeamEloChart — locale prop (cycle 2112, EN page parity fix)", () => {
  it("locale prop defaults to ko (KO callsite passes no prop, existing behavior preserved)", () => {
    expect(SRC).toMatch(/locale\?:\s*"ko"\s*\|\s*"en";/);
    expect(SRC).toMatch(/locale = "ko"/);
  });

  it("league-avg label swaps to English when locale=en", () => {
    expect(SRC).toMatch(/const leagueAvgLabel = locale === "en" \? "League Avg" : "리그 평균";/);
    expect(SRC).not.toMatch(/label: p\.name === "elo" \? teamName : "리그 평균"/);
    expect(SRC).not.toMatch(/formatter=\{\(value\) => \(value === "elo" \? teamName : "리그 평균"\)\}/);
  });
});
