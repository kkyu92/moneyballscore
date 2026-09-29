import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { selectTopFactors } from "@/lib/insights/topFactors";
import { insightsStatusBadge } from "@/lib/insights/statusBadge";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_SRC = readFileSync(resolve(__dirname, "../insights-data.ts"), "utf8");
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
const EN_PAGE_SRC = readFileSync(
  resolve(__dirname, "../../../en/mlb/insights/page.tsx"),
  "utf8",
);
const DATE_PAGE_SRC = readFileSync(resolve(__dirname, "../[date]/page.tsx"), "utf8");
const EN_DATE_PAGE_SRC = readFileSync(
  resolve(__dirname, "../../../en/mlb/insights/[date]/page.tsx"),
  "utf8",
);
const SITEMAP_SRC = readFileSync(resolve(__dirname, "../../../sitemap.ts"), "utf8");
const HEADER_SRC = readFileSync(
  resolve(__dirname, "../../../../components/layout/Header.tsx"),
  "utf8",
);
const FOOTER_SRC = readFileSync(
  resolve(__dirname, "../../../../components/layout/Footer.tsx"),
  "utf8",
);

describe("mlb/insights/insights-data.ts — KBO /insights hub parity, mlb_schedule join model", () => {
  it("predictions 를 league='mlb' 로 먼저 조회 후 mlb_schedule 로 팀코드/상태 2-step join (plan #24 CRITICAL Part1/2 재발 방지, KBO games!inner 조인 미사용)", () => {
    expect(DATA_SRC).not.toMatch(/\.select\([^)]*games!inner/);
    expect(DATA_SRC).toMatch(/from\("mlb_schedule"\)/);
    expect(DATA_SRC).toMatch(/in\("external_game_id", gameIds\)/);
  });

  it("league='mlb' + prediction_type='pre_game' + MLB_PRODUCTION_COHORT_RULES 필터 (CE-fallback family 정합)", () => {
    expect(DATA_SRC).toMatch(/\.eq\("league", "mlb"\)/);
    expect(DATA_SRC).toMatch(/\.eq\("prediction_type", "pre_game"\)/);
    expect(DATA_SRC).toMatch(/in\("scoring_rule", MLB_PRODUCTION_COHORT_RULES/);
  });

  it("presentJudgeReasoningWithFallback 재사용 (KBO 와 동일 reasoning.debate.verdict.reasoning 경로 가정)", () => {
    expect(DATA_SRC).toMatch(/presentJudgeReasoningWithFallback\(/);
    expect(DATA_SRC).toMatch(/row\.reasoning\?\.debate\?\.verdict/);
  });

  it("normalizeMlbTeamCode 로 mlb_schedule.home_team_code/away_team_code 정규화 (alias 미매칭 시 skip)", () => {
    expect(DATA_SRC).toMatch(/normalizeMlbTeamCode\(schedule\.home_team_code\)/);
    expect(DATA_SRC).toMatch(/normalizeMlbTeamCode\(schedule\.away_team_code\)/);
  });
});

describe("mlb/insights/page.tsx (ko hub)", () => {
  it("Breadcrumb 2단계 (MLB 분석 → AI 인사이트)", () => {
    expect(PAGE_SRC).toMatch(/\{ label: "MLB 분석", href: "\/mlb" \}/);
    expect(PAGE_SRC).toMatch(/\{ label: "AI 인사이트" \}/);
  });

  it("일자 카드 기본 링크는 여전히 /mlb/games/[date] 사용, 팩터 있을 때만 /mlb/insights/[date] 아카이브로 연결 (plan #30 Phase 2)", () => {
    expect(PAGE_SRC).toMatch(/href=\{`\/mlb\/games\/\$\{item\.date\}`\}/);
    expect(PAGE_SRC).toMatch(/href=\{`\/mlb\/insights\/\$\{item\.date\}#factor-breakdown-\$\{item\.gameId\}`\}/);
  });

  it("revalidate = 86400 ISR (INSIGHTS_ISR_SECONDS 정합, Turbopack literal required)", () => {
    expect(PAGE_SRC).toMatch(/export const revalidate = 86400\b/);
  });

  it("selectTopFactors / insightsStatusBadge / presentJudgeReasoningWithFallback — league-agnostic 헬퍼 재사용 (신규 MLB 전용 파생 X)", () => {
    expect(PAGE_SRC).toMatch(/import \{ selectTopFactors \} from "@\/lib\/insights\/topFactors"/);
    expect(PAGE_SRC).toMatch(/import \{ insightsStatusBadge \} from "@\/lib\/insights\/statusBadge"/);
    expect(DATA_SRC).toMatch(/presentJudgeReasoningWithFallback/);
  });

  it("mini factor preview 블록 (data-mini-factor-preview, KBO 패턴 재사용)", () => {
    expect(PAGE_SRC).toMatch(/data-mini-factor-preview/);
    expect(PAGE_SRC).toMatch(/topFactors\.length > 0/);
  });

  it("EN alternates 선언 (/en/mlb/insights)", () => {
    expect(PAGE_SRC).toMatch(/en:\s*`\$\{SITE_URL\}\/en\/mlb\/insights`/);
  });

  it("Article JSON-LD (@context/@type/@id) 박제", () => {
    expect(PAGE_SRC).toMatch(/"@context":\s*"https:\/\/schema\.org"/);
    expect(PAGE_SRC).toMatch(/"@type":\s*"Article"/);
    expect(PAGE_SRC).toMatch(/"@id":\s*PAGE_URL/);
  });
});

describe("en/mlb/insights/page.tsx (en mirror)", () => {
  it("공유 insights-data.ts 재사용 (KO 전용 재구현 X, DRY)", () => {
    expect(EN_PAGE_SRC).toMatch(
      /import \{ getRecentMlbInsights \} from "@\/app\/mlb\/insights\/insights-data"/,
    );
  });

  it("locale=en Breadcrumb + /en/mlb href", () => {
    expect(EN_PAGE_SRC).toMatch(/locale="en"/);
    expect(EN_PAGE_SRC).toMatch(/href:\s*"\/en\/mlb"/);
  });

  it("EN canonical + KO alternate 상호 링크", () => {
    expect(EN_PAGE_SRC).toMatch(/en\/mlb\/insights/);
    expect(EN_PAGE_SRC).toMatch(/ko:\s*`\$\{SITE_URL\}\/mlb\/insights`/);
  });
});

describe("sitemap.ts — /mlb/insights + /en/mlb/insights entries", () => {
  it("KO + EN URL 둘 다 존재", () => {
    expect(SITEMAP_SRC).toMatch(/\$\{SITE_URL\}\/mlb\/insights`/);
    expect(SITEMAP_SRC).toMatch(/\$\{SITE_URL\}\/en\/mlb\/insights`/);
  });

  it("plan #30 Phase 2 — /mlb/insights/[date] + /en/mlb/insights/[date] 아카이브 URL 배선", () => {
    expect(SITEMAP_SRC).toMatch(/listMlbInsightsDates/);
    expect(SITEMAP_SRC).toMatch(/\$\{SITE_URL\}\/mlb\/insights\/\$\{d\}`/);
    expect(SITEMAP_SRC).toMatch(/\$\{SITE_URL\}\/en\/mlb\/insights\/\$\{d\}`/);
  });
});

describe("mlb/insights/insights-data.ts — plan #30 Phase 2 date-archive functions", () => {
  it("listMlbInsightsDates / getMlbInsightsForDate export (KBO loader.ts mlb_schedule 이식)", () => {
    expect(DATA_SRC).toMatch(/export async function listMlbInsightsDates/);
    expect(DATA_SRC).toMatch(/export async function getMlbInsightsForDate/);
  });

  it("isValidInsightsDate 재사용 (league-agnostic, 신규 MLB 전용 날짜 검증 X)", () => {
    expect(DATA_SRC).toMatch(/import \{ isValidInsightsDate \} from "@\/lib\/insights\/loader"/);
  });

  it("getMlbInsightsForDate 는 mlb_game_date 로 직접 필터 (games FK 조인 없음, predictions 컬럼 이미 보유)", () => {
    expect(DATA_SRC).toMatch(/\.eq\("mlb_game_date", date\)/);
  });
});

describe("mlb/insights/[date]/page.tsx (ko archive, plan #30 Phase 2)", () => {
  it("Breadcrumb 3단계 (MLB 분석 → AI 인사이트 → 일자)", () => {
    expect(DATE_PAGE_SRC).toMatch(/\{ label: "MLB 분석", href: "\/mlb" \}/);
    expect(DATE_PAGE_SRC).toMatch(/\{ label: "AI 인사이트", href: "\/mlb\/insights" \}/);
  });

  it("dynamicParams=false + generateStaticParams(listMlbInsightsDates) — 존재하는 일자만 정적 생성", () => {
    expect(DATE_PAGE_SRC).toMatch(/export const dynamicParams = false/);
    expect(DATE_PAGE_SRC).toMatch(/listMlbInsightsDates\(90\)/);
  });

  it("entries 0건 시 notFound() (KBO /insights/[date] 패턴 재사용)", () => {
    expect(DATE_PAGE_SRC).toMatch(/entries\.length === 0\) notFound\(\)/);
  });

  it("li 앵커 id=factor-breakdown-{gameId} — hub 의 '전체 팩터 보기' 링크 타겟과 일치", () => {
    expect(DATE_PAGE_SRC).toMatch(/id=\{`factor-breakdown-\$\{item\.gameId\}`\}/);
  });
});

describe("en/mlb/insights/[date]/page.tsx (en mirror, plan #30 Phase 2)", () => {
  it("공유 insights-data.ts 재사용 (DRY)", () => {
    expect(EN_DATE_PAGE_SRC).toMatch(
      /import \{ getMlbInsightsForDate, listMlbInsightsDates \} from "@\/app\/mlb\/insights\/insights-data"/,
    );
  });

  it("locale=en Breadcrumb + /en/mlb/insights href", () => {
    expect(EN_DATE_PAGE_SRC).toMatch(/locale="en"/);
    expect(EN_DATE_PAGE_SRC).toMatch(/href: "\/en\/mlb\/insights" \}/);
  });
});

describe("Header.tsx / Footer.tsx — /mlb/insights nav wiring (cycle 2153 recurring gap family 재발 방지)", () => {
  it("헤더 MLB 메가메뉴에 AI 인사이트 링크 배선 (enLabel 포함, withLocale 자동 /en 치환 안전)", () => {
    expect(HEADER_SRC).toMatch(/\{ href: "\/mlb\/insights", label: "AI 인사이트", enLabel: "AI Insights"/);
  });

  it("푸터 MLB 컬럼에도 AI 인사이트 링크 배선", () => {
    expect(FOOTER_SRC).toMatch(/\{ href: "\/mlb\/insights", label: "AI 인사이트", enLabel: "AI Insights" \}/);
  });
});

describe("selectTopFactors / insightsStatusBadge — league-agnostic 재검증 (MLB 재사용 가정 회귀 가드)", () => {
  it("selectTopFactors 는 factors record 만 입력받아 순수 계산 (리그 개념 없음)", () => {
    expect(selectTopFactors(null)).toEqual([]);
    expect(selectTopFactors({ elo: 0.7 }).length).toBeGreaterThan(0);
  });

  it("insightsStatusBadge 는 status/isCorrect 문자열만 입력받아 순수 계산 (mlb_schedule.status 'scheduled'/'final' 값과 호환)", () => {
    expect(insightsStatusBadge("scheduled", null).label).toBe("예정");
    expect(insightsStatusBadge("final", null).label).toBe("결과 대기");
    expect(insightsStatusBadge("final", true).label).toBe("적중");
    expect(insightsStatusBadge("final", false).label).toBe("빗나감");
  });
});
