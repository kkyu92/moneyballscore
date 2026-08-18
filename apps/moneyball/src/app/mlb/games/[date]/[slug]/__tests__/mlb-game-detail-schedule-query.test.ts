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
    expect(PAGE_SRC).toMatch(/slug: 'sp_xfip'/);
    expect(PAGE_SRC).toMatch(/slug: 'war'/);
  });

  // cycle 2108 review-code heavy: heading/description 이 MLB_FACTOR_COUNTS.total(14, 전체
  // 모델 상수)을 그대로 써서 "14팩터" 클레임 vs 실제 7행 렌더 mismatch — cycle 2102 가 5→7행
  // 으로 늘렸지만 카운트 클레임 자체는 안 고쳐 재발. GAME_DETAIL_FACTOR_ROWS.length 로
  // self-sync 시켜 향후 행 추가/삭제 시 자동 반영, 하드코딩 상수 재도입 차단.
  it("heading 팩터 카운트가 실제 렌더 행 배열 길이로 self-sync 한다 (하드코딩 상수 재발 차단)", () => {
    expect(PAGE_SRC).toMatch(/GAME_DETAIL_FACTOR_ROWS\.length/);
    expect(PAGE_SRC).not.toMatch(/MLB_FACTOR_COUNTS/);
  });

  // cycle 2107 explore-idea: KBO analysis/game/[id] 는 ShareButtons + RelatedLinks(팀 프로필/
  // 매치업/같은 날짜 경기)가 있는데 MLB 는 없었음 — debate/verdict/postview 는 MLB predict_final
  // 이 quant-only(plan #25 Phase 3 게이트)라 데이터 자체가 없어 parity 대상 아님, 이 두 컴포넌트만
  // 순수 additive parity 대상.
  it("ShareButtons + RelatedLinks 를 렌더한다 (KBO parity, cycle 2107)", () => {
    expect(PAGE_SRC).toMatch(/<ShareButtons/);
    expect(PAGE_SRC).toMatch(/<RelatedLinks/);
    expect(PAGE_SRC).toMatch(/mlbCanonicalPair/);
    expect(PAGE_SRC).toMatch(/\/mlb\/team\/\$\{home\}/);
  });

  // cycle 2164 explore-idea: HistoricalAnalogMatchup(analysis/game/[id])은 순수 팩트(스케줄+
  // 확률)라 debate/postview quant-only 게이트와 무관 — 그동안 parity 대상에서 빠져있었음.
  it("MlbHistoricalAnalogMatchup 을 렌더한다 (같은 두 팀 과거 대결 parity, cycle 2164)", () => {
    expect(PAGE_SRC).toMatch(/<MlbHistoricalAnalogMatchup/);
    expect(PAGE_SRC).toMatch(/externalGameId=\{schedule\.external_game_id\}/);
    expect(PAGE_SRC).toMatch(/asOfDate=\{date\}/);
  });
});
