import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

// cycle 2099 fix-incident: 이 페이지는 KBO 전용 games(FK) 스키마로 predictions.game_id 조인을
// 시도해 MLB 행(game_id=NULL, migration 038) 전부와 항상 미스매치 — 실제 매치업 페이지가
// 링크하는 모든 경기가 silent 404 였음. mlb_schedule + external_game_id 조인으로 재발 차단.
describe("mlb/games/[date]/[slug] mlb_schedule 조인 회귀 가드 (cycle 2099)", () => {
  it("mlb_schedule 테이블로 조회한다", () => {
    expect(PAGE_SRC).toMatch(/\.from\(['"]mlb_schedule['"]\)/);
  });

  it("predictions 조회는 external_game_id + league='mlb' 키를 쓴다", () => {
    expect(PAGE_SRC).toMatch(/external_game_id/);
    expect(PAGE_SRC).toMatch(/\.eq\(['"]league['"],\s*['"]mlb['"]\)/);
  });

  it("KBO 전용 games!inner FK 조인을 재도입하지 않는다 (silent 404 회귀 차단)", () => {
    expect(PAGE_SRC).not.toMatch(/games!inner/);
    expect(PAGE_SRC).not.toMatch(/predicted_winner_team/);
  });

  it("StatsAPI 팀 코드 정규화 없이 mlb_schedule 을 조회하지 않는다 (7팀 alias 사례 27 회귀 차단)", () => {
    expect(PAGE_SRC).toMatch(/toMlbStatsApiCode/);
  });

  it("SportsEvent JSON-LD 를 렌더한다 (KBO analysis/game/[id] parity, cycle 2099 explore-idea)", () => {
    expect(PAGE_SRC).toMatch(/"@type":\s*"SportsEvent"/);
    expect(PAGE_SRC).toMatch(/application\/ld\+json/);
  });

  // cycle 2102 review-code: home_sp_xfip/away_sp_xfip + home_war_total/away_war_total 는
  // mlb-pipeline.ts 가 실제 값(placeholder 아님)으로 저장하는데 이 페이지가 select 에서
  // 누락해 DB 에 있는 데이터를 안 보여주고 있었음 (14팩터 클레임 vs 5개만 렌더).
  it("sp_xfip + war_total 팩터를 select + 렌더한다 (DB 실측 데이터 누락 회귀 차단)", () => {
    expect(PAGE_SRC).toMatch(/home_sp_xfip/);
    expect(PAGE_SRC).toMatch(/home_war_total/);
    expect(PAGE_SRC).toMatch(/slug="sp_xfip"/);
    expect(PAGE_SRC).toMatch(/slug="war"/);
  });
});
