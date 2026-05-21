import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isValidInsightsDate } from "../loader";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOADER_SRC = readFileSync(resolve(__dirname, "../loader.ts"), "utf8");

describe("isValidInsightsDate", () => {
  it("ISO YYYY-MM-DD 정상 일자 → true", () => {
    expect(isValidInsightsDate("2026-05-21")).toBe(true);
    expect(isValidInsightsDate("2025-12-31")).toBe(true);
    expect(isValidInsightsDate("2023-01-01")).toBe(true);
  });

  it("format mismatch → false", () => {
    expect(isValidInsightsDate("2026-5-21")).toBe(false);
    expect(isValidInsightsDate("26-05-21")).toBe(false);
    expect(isValidInsightsDate("2026/05/21")).toBe(false);
    expect(isValidInsightsDate("20260521")).toBe(false);
    expect(isValidInsightsDate("")).toBe(false);
  });

  it("year prefix mismatch (regex 20[2-9]\\d) → false", () => {
    expect(isValidInsightsDate("1999-12-31")).toBe(false);
    expect(isValidInsightsDate("2010-01-01")).toBe(false);
    expect(isValidInsightsDate("3000-01-01")).toBe(false);
  });

  it("month/day out of range → false", () => {
    expect(isValidInsightsDate("2026-00-15")).toBe(false);
    expect(isValidInsightsDate("2026-13-15")).toBe(false);
    expect(isValidInsightsDate("2026-05-00")).toBe(false);
    expect(isValidInsightsDate("2026-05-32")).toBe(false);
  });

  it("실제 존재하지 않는 일자 (윤년 외 2/29 / 2/30 등) → false", () => {
    expect(isValidInsightsDate("2025-02-29")).toBe(false);
    expect(isValidInsightsDate("2026-02-30")).toBe(false);
    expect(isValidInsightsDate("2026-04-31")).toBe(false);
    expect(isValidInsightsDate("2026-06-31")).toBe(false);
  });

  it("윤년 2/29 → true", () => {
    expect(isValidInsightsDate("2024-02-29")).toBe(true);
    expect(isValidInsightsDate("2028-02-29")).toBe(true);
  });
});

describe("loader.ts supabase select column guard (cycle 849 silent drift family 사례 12)", () => {
  it("games.home_team_code / away_team_code 참조 부재 — FK join 패턴만 사용", () => {
    expect(LOADER_SRC).not.toMatch(/home_team_code/);
    expect(LOADER_SRC).not.toMatch(/away_team_code/);
  });

  it("teams!games_(home|away)_team_id_fkey FK alias 포함", () => {
    expect(LOADER_SRC).toMatch(/home_team:teams!games_home_team_id_fkey\(code\)/);
    expect(LOADER_SRC).toMatch(/away_team:teams!games_away_team_id_fkey\(code\)/);
  });
});
