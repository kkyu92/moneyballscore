import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

// cycle 2108 review-code heavy: EN 미러가 KBO 전용 games(FK) 스키마로 predictions.game_id
// 조인을 시도해 MLB 행(game_id=NULL, migration 038) 전부와 항상 미스매치 — /en/mlb/games/
// [date]/[slug] 가 존재하는 모든 MLB 경기에 대해 silent 404 였음. KO page.tsx 는 cycle 2099
// 이미 mlb_schedule + external_game_id 조인으로 고쳤지만 EN 미러는 그때 동기 안 됨.
describe("en/mlb/games/[date]/[slug] mlb_schedule 조인 회귀 가드 (cycle 2108)", () => {
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

  it("heading 팩터 카운트가 실제 렌더 행 배열 길이로 self-sync 한다 (하드코딩 상수 재발 차단)", () => {
    expect(PAGE_SRC).toMatch(/GAME_DETAIL_FACTOR_ROWS\.length/);
    expect(PAGE_SRC).not.toMatch(/MLB_FACTOR_COUNTS/);
  });
});
