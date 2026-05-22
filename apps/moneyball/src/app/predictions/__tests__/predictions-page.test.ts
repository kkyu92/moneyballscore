import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

describe("predictions/page.tsx supabase select column guard (cycle 869 silent drift family 사례 14)", () => {
  it("games.home_team_code / away_team_code 참조 부재 — FK join 패턴만 사용", () => {
    expect(PAGE_SRC).not.toMatch(/home_team_code/);
    expect(PAGE_SRC).not.toMatch(/away_team_code/);
  });

  it("teams!games_(home|away)_team_id_fkey FK alias 포함", () => {
    expect(PAGE_SRC).toMatch(/home_team:teams!games_home_team_id_fkey\(code\)/);
    expect(PAGE_SRC).toMatch(/away_team:teams!games_away_team_id_fkey\(code\)/);
  });
});
