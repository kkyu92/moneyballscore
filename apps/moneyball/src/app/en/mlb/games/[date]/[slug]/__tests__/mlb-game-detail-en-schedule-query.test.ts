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

// cycle 2109 review-code heavy: KO page.tsx 가 cycle 2099(SportsEvent JSON-LD)/2104
// (MlbFactorWaterfallChart)/2107(ShareButtons+RelatedLinks) 에서 순차 추가된 4개 컴포넌트를
// EN 미러엔 한 번도 동기하지 않아 KO/EN parity gap silent 누적 (게시 후 발견 불가 — 두 페이지
// 비교 diff 로만 드러남).
describe("en/mlb/games/[date]/[slug] KO parity 회귀 가드 (cycle 2109)", () => {
  it("SportsEvent JSON-LD 를 렌더한다 (KO parity, cycle 2099)", () => {
    expect(PAGE_SRC).toMatch(/application\/ld\+json/);
    expect(PAGE_SRC).toMatch(/"@type":\s*"SportsEvent"/);
  });

  it("MlbFactorWaterfallChart 를 렌더한다 (KO parity, cycle 2104)", () => {
    expect(PAGE_SRC).toMatch(/<MlbFactorWaterfallChart/);
  });

  it("ShareButtons + RelatedLinks 를 렌더한다 (KO parity, cycle 2107)", () => {
    expect(PAGE_SRC).toMatch(/<ShareButtons/);
    expect(PAGE_SRC).toMatch(/<RelatedLinks/);
    expect(PAGE_SRC).toMatch(/mlbCanonicalPair/);
    expect(PAGE_SRC).toMatch(/\/en\/mlb\/team\/\$\{home\}/);
  });

  it("MlbHistoricalAnalogMatchup 을 locale='en' 으로 렌더한다 (KO parity, cycle 2164)", () => {
    expect(PAGE_SRC).toMatch(/<MlbHistoricalAnalogMatchup/);
    expect(PAGE_SRC).toMatch(/locale="en"/);
    expect(PAGE_SRC).toMatch(/externalGameId=\{schedule\.external_game_id\}/);
  });

  // cycle 2412 review-code heavy: KO page.tsx 와 동일한 recent_form scale mismatch(DB 0-1
  // 승률을 mlb-waterfall.ts 0-100 계약에 그대로 넘겨 bar/표시값 100배 축소)가 EN 미러에도
  // 동일하게 존재 — 양쪽 동시 fix, 회귀 차단.
  it("recent_form 을 waterfallInput 에 0-100 스케일로 변환해 넘긴다 (scale mismatch 회귀 차단, KO parity)", () => {
    expect(PAGE_SRC).toMatch(/pred\.home_recent_form\s*==\s*null\s*\?\s*null\s*:\s*pred\.home_recent_form\s*\*\s*100/);
    expect(PAGE_SRC).toMatch(/pred\.away_recent_form\s*==\s*null\s*\?\s*null\s*:\s*pred\.away_recent_form\s*\*\s*100/);
  });

  // cycle 2457 explore-idea: KO page.tsx home_starter_name/away_starter_name parity.
  it("home_starter_name/away_starter_name 을 select + 선발 표시로 렌더한다 (KO parity, cycle 2457)", () => {
    expect(PAGE_SRC).toMatch(/home_starter_name,\s*away_starter_name/);
    expect(PAGE_SRC).toMatch(/SP/);
  });

  // cycle 2509 review-code heavy: KO page.tsx 와 동일한 claim-vs-render mismatch fix
  // (MlbGameOverview factorCount 정적 배열 길이 → 실제 waterfallBars 기반 동적 카운트).
  it("MlbGameOverview factorCount 는 정적 배열 길이가 아닌 실제 waterfallBars 기반 동적 카운트를 쓴다 (claim-vs-render mismatch 회귀 차단, KO parity, cycle 2509)", () => {
    expect(PAGE_SRC).toMatch(/const usedFactorCount = waterfallBars\.filter/);
    expect(PAGE_SRC).toMatch(/factorCount=\{usedFactorCount\}/);
    expect(PAGE_SRC).not.toMatch(/factorCount=\{GAME_DETAIL_FACTOR_ROWS\.length\}/);
  });

  // cycle 2737 fix-incident: KO page.tsx 와 동일한 더블헤더 multiple-rows throw
  // (Sentry MONEYBALLSCORE-1A, 357회, 2026-08-18~08-29) — order+limit(1) 로 방지, KO parity.
  it("mlb_schedule 조회에 order+limit(1) 을 적용해 더블헤더 multiple-rows throw 를 방지한다 (Sentry MONEYBALLSCORE-1A 회귀 차단, KO parity, cycle 2737)", () => {
    expect(PAGE_SRC).toMatch(/\.order\(['"]game_datetime_utc['"],\s*\{\s*ascending:\s*true\s*\}\)\s*\n\s*\.limit\(1\)\s*\n\s*\.maybeSingle\(\)/);
  });
});
