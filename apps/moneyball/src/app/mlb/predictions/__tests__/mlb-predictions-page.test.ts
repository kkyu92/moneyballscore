import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
const SITEMAP_SRC = readFileSync(resolve(__dirname, "../../../sitemap.ts"), "utf8");
const HEADER_SRC = readFileSync(
  resolve(__dirname, "../../../../components/layout/Header.tsx"),
  "utf8",
);
const FOOTER_SRC = readFileSync(
  resolve(__dirname, "../../../../components/layout/Footer.tsx"),
  "utf8",
);

describe("mlb/predictions/page.tsx — KBO /predictions parity MVP", () => {
  it("mlb_schedule 을 편성 경기 원천으로 쓰고 predictions 를 external_game_id 로 map (KBO games FK 모델 없음)", () => {
    expect(PAGE_SRC).toMatch(/from\('mlb_schedule'\)/);
    expect(PAGE_SRC).toMatch(/in\('external_game_id', scheduleRows\.map/);
  });

  it("league='mlb' + MLB_PRODUCTION_COHORT_RULES 필터 (CE-fallback family 정합)", () => {
    expect(PAGE_SRC).toMatch(/eq\('league', 'mlb'\)/);
    expect(PAGE_SRC).toMatch(/in\('scoring_rule', MLB_PRODUCTION_COHORT_RULES\)/);
  });

  it("deriveMlbOutcome 으로 is_correct derive (predictions.is_correct 전량 NULL 이라 직접 계산 필요)", () => {
    expect(PAGE_SRC).toMatch(/deriveMlbOutcome\(/);
  });

  it("Breadcrumb 2 단계 (MLB 분석 → 예측 기록) + 날짜 링크는 /mlb/games/[date] (기존 라우트)", () => {
    expect(PAGE_SRC).toMatch(/\{ label: 'MLB 분석', href: '\/mlb' \}/);
    expect(PAGE_SRC).toMatch(/href=\{`\/mlb\/games\/\$\{d\.date\}`\}/);
  });

  it("revalidate = 1800 ISR (MLB_LIVE_ISR_SECONDS 정합, Turbopack literal required)", () => {
    expect(PAGE_SRC).toMatch(/export const revalidate = 1800\b/);
  });

  it("MlbPredictionsSearchBox 사용 (KBO PredictionsSearchBox 는 KBO_TEAMS 결합이라 재사용 불가)", () => {
    expect(PAGE_SRC).toMatch(/MlbPredictionsSearchBox/);
    expect(PAGE_SRC).not.toMatch(/from ["']@\/components\/predictions\/PredictionsSearchBox["']/);
  });

  it("필터 컴포넌트(Status/Tier/Month/Sort/AccuracyHeaderCard) 는 KBO 것 그대로 재사용 (TeamCode 비결합 확인됨)", () => {
    expect(PAGE_SRC).toMatch(/PredictionsStatusFilter/);
    expect(PAGE_SRC).toMatch(/PredictionsTierFilter/);
    expect(PAGE_SRC).toMatch(/PredictionsMonthFilter/);
    expect(PAGE_SRC).toMatch(/PredictionsSortControl/);
    expect(PAGE_SRC).toMatch(/AccuracyHeaderCard/);
  });

  it("data-prediction-* 속성 컨벤션 KBO 와 동일 (필터/검색 CSS hide-rule 재사용 전제)", () => {
    expect(PAGE_SRC).toMatch(/data-prediction-status=\{status\}/);
    expect(PAGE_SRC).toMatch(/data-prediction-tiers=\{tiersPresent\}/);
    expect(PAGE_SRC).toMatch(/data-prediction-month=\{d\.date\.slice\(0, 7\)\}/);
    expect(PAGE_SRC).toMatch(/data-prediction-date=\{d\.date\}/);
    expect(PAGE_SRC).toMatch(/data-prediction-teams=\{Array\.from\(d\.teamCodes\)\.join\(' '\)\}/);
  });

  it("EN mirror 완성 (cycle 2220) — languages alternate 선언, /en/mlb/predictions 참조", () => {
    expect(PAGE_SRC).toMatch(/languages:\s*\{\s*en:\s*`\$\{SITE_URL\}\/en\/mlb\/predictions`/);
  });
});

describe("sitemap.ts — /mlb/predictions entry", () => {
  it("KO + EN entry 둘 다 존재 (cycle 2220 EN mirror)", () => {
    expect(SITEMAP_SRC).toMatch(/\$\{SITE_URL\}\/mlb\/predictions`/);
    expect(SITEMAP_SRC).toMatch(/\$\{SITE_URL\}\/en\/mlb\/predictions`/);
  });
});

describe("Header.tsx / Footer.tsx — /mlb/predictions nav wiring", () => {
  it("헤더 MLB 메가메뉴 + 푸터 MLB 컬럼 양쪽에 예측 기록 링크 배선", () => {
    expect(HEADER_SRC).toMatch(/\{ href: "\/mlb\/predictions", label: "예측 기록"/);
    expect(FOOTER_SRC).toMatch(/\{ href: "\/mlb\/predictions", label: "예측 기록"/);
  });
});
