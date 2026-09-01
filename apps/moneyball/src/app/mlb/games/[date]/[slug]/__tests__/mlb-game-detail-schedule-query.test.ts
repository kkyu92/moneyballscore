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

  // cycle 2412 review-code heavy: home_recent_form/away_recent_form 은 DB 에 0-1 승률로
  // 저장(KBO 동일 컨벤션)되지만 mlb-waterfall.ts/mlb-base.ts recent_form 계약은 0-100(백분율)
  // 스케일 — 그대로 넘기면 waterfall bar/factor-detail 표시가 100배 축소되는 scale mismatch
  // 였음. *100 변환 없이 원본 컬럼을 그대로 waterfallInput 에 넣는 회귀 차단.
  it("recent_form 을 waterfallInput 에 0-100 스케일로 변환해 넘긴다 (scale mismatch 회귀 차단)", () => {
    expect(PAGE_SRC).toMatch(/pred\.home_recent_form\s*==\s*null\s*\?\s*null\s*:\s*pred\.home_recent_form\s*\*\s*100/);
    expect(PAGE_SRC).toMatch(/pred\.away_recent_form\s*==\s*null\s*\?\s*null\s*:\s*pred\.away_recent_form\s*\*\s*100/);
  });

  // cycle 2424 explore-idea: KBO analysis/game/[id] 는 model_version/debate_version/
  // predicted_at 기반 "모델 메타 정보" 블록(정량 모델 + 토론 버전 + 리드타임)이 있었지만
  // MLB predictions insert 가 이 3컬럼을 명시 안 해 DB DEFAULT 상속(cycle 2423 fix 전까지
  // predicted_at 항상 NULL) — 표시할 실측값 자체가 없어 parity 대상에서 빠져있었음.
  // cycle 2423 이 predicted_at 을 실측으로 채우면서 이식 가능해짐.
  it("model_version/debate_version/predicted_at 을 select + 모델 메타 정보 블록으로 렌더한다 (KBO parity, cycle 2424)", () => {
    expect(PAGE_SRC).toMatch(/model_version,\s*\n\s*debate_version,\s*\n\s*predicted_at/);
    expect(PAGE_SRC).toMatch(/모델 메타 정보/);
    expect(PAGE_SRC).toMatch(/predictionLeadHours/);
    expect(PAGE_SRC).toMatch(/HOUR_MS/);
  });

  // cycle 2457 explore-idea: statsapi-mlb.ts 의 fetchProbablePitchers 가 선발투수 이름을 이미
  // 반환하지만 어떤 mode 도 소비하지 않아 KBO(analysis/game/[id] wave-335) 대비 완전 미이식
  // 상태였음 — mlb_schedule.home/away_starter_name(migration 051) select + 표시 회귀 가드.
  it("home_starter_name/away_starter_name 을 select + 선발 표시로 렌더한다 (KBO parity, cycle 2457)", () => {
    expect(PAGE_SRC).toMatch(/home_starter_name,\s*away_starter_name/);
    expect(PAGE_SRC).toMatch(/선발/);
  });

  // cycle 2461 explore-idea: KBO analysis/game/[id] wave-452/478 팩터 수렴 픽 배지가 MLB game
  // detail 단건 페이지엔 없었음 — computeMlbCompositeDuel/getMlbRecentConvergencePickRecord
  // 인프라 자체는 matchup/reviews 페이지가 이미 사용 중이라 순수 배선 누락.
  it("computeMlbCompositeDuel + getMlbRecentConvergencePickRecord 로 팩터 수렴 픽 배지를 렌더한다 (KBO parity, cycle 2461)", () => {
    expect(PAGE_SRC).toMatch(/computeMlbCompositeDuel/);
    expect(PAGE_SRC).toMatch(/getMlbRecentConvergencePickRecord/);
    expect(PAGE_SRC).toMatch(/MLB_FACTOR_PICK_STRONG/);
    expect(PAGE_SRC).toMatch(/MLB_FACTOR_PICK_COMPLETE/);
    expect(PAGE_SRC).toMatch(/팩터 수렴 픽/);
    expect(PAGE_SRC).toMatch(/팩터 균형/);
  });

  // cycle 2509 review-code heavy: MlbGameOverview 프로즈("N개 팩터 종합")가
  // GAME_DETAIL_FACTOR_ROWS.length(모델 최대 팩터 수, 항상 10)를 그대로 써 특정 경기의
  // elo/war 등 팀 데이터 결측으로 computeMlbWaterfall 이 factor bar 를 skip 해도 카운트가
  // 안 줄어듦 — 같은 화면의 MlbDetailedFactorAnalysis 제목(rows.length, self-sync)과
  // 모순되는 claim-vs-render mismatch (cycle 2108 family 재발). 실제 waterfallBars 기반
  // 동적 카운트로 정정한 회귀 가드.
  it("MlbGameOverview factorCount 는 정적 배열 길이가 아닌 실제 waterfallBars 기반 동적 카운트를 쓴다 (claim-vs-render mismatch 회귀 차단, cycle 2509)", () => {
    expect(PAGE_SRC).toMatch(/const usedFactorCount = waterfallBars\.filter/);
    expect(PAGE_SRC).toMatch(/factorCount=\{usedFactorCount\}/);
    expect(PAGE_SRC).not.toMatch(/factorCount=\{GAME_DETAIL_FACTOR_ROWS\.length\}/);
  });

  // cycle 2737 fix-incident: 더블헤더(같은 날 같은 매치업 2경기)에서 (game_date, home, away)
  // 로만 조회하면 mlb_schedule row 가 2개 매칭 — .maybeSingle() 이 "multiple rows" 로 throw
  // (Sentry MONEYBALLSCORE-1A, 357회, 2026-08-18~08-29). order+limit(1) 로 결정적 단일 row 보장.
  it("mlb_schedule 조회에 order+limit(1) 을 적용해 더블헤더 multiple-rows throw 를 방지한다 (Sentry MONEYBALLSCORE-1A 회귀 차단, cycle 2737)", () => {
    expect(PAGE_SRC).toMatch(/\.order\(['"]game_datetime_utc['"],\s*\{\s*ascending:\s*true\s*\}\)\s*\n\s*\.limit\(1\)\s*\n\s*\.maybeSingle\(\)/);
  });
});
