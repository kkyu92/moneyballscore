import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatMlbSeriesTopic,
  listMlbSeriesTopics,
  parseMlbSeriesTopic,
} from "../insights-data";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_SRC = readFileSync(resolve(__dirname, "../insights-data.ts"), "utf8");
const SERIES_PAGE_SRC = readFileSync(
  resolve(__dirname, "../series/[topic]/page.tsx"),
  "utf8",
);
const EN_SERIES_PAGE_SRC = readFileSync(
  resolve(__dirname, "../../../en/mlb/insights/series/[topic]/page.tsx"),
  "utf8",
);
const SITEMAP_SRC = readFileSync(resolve(__dirname, "../../../sitemap.ts"), "utf8");

// plan #30 Phase 3 — /mlb/insights/series/[topic] + EN mirror. KBO lib/insights/series.ts
// 의 formatSeriesTopic/parseSeriesTopic/listSeriesTopics MLB 이식 회귀 가드.

describe("mlb/insights/insights-data.ts — series topic helpers (plan #30 Phase 3)", () => {
  it("formatMlbSeriesTopic — alphabetic canonical (NYY vs BOS → bos-vs-nyy)", () => {
    expect(formatMlbSeriesTopic("NYY", "BOS")).toBe("bos-vs-nyy");
    expect(formatMlbSeriesTopic("BOS", "NYY")).toBe("bos-vs-nyy");
    expect(formatMlbSeriesTopic("LAD", "SFG")).toBe("lad-vs-sfg");
  });

  it("parseMlbSeriesTopic — canonical slug → MlbSeriesTopic", () => {
    const topic = parseMlbSeriesTopic("bos-vs-nyy");
    expect(topic).not.toBeNull();
    expect(topic!.team1).toBe("BOS");
    expect(topic!.team2).toBe("NYY");
    expect(topic!.slug).toBe("bos-vs-nyy");
  });

  it("parseMlbSeriesTopic — invalid 입력 reject (non-canonical, same team, unknown code, garbage, 2-letter KBO 코드)", () => {
    // non-canonical order (NYY > BOS alphabetically) → null (redirect to canonical 권장)
    expect(parseMlbSeriesTopic("nyy-vs-bos")).toBeNull();
    // same team
    expect(parseMlbSeriesTopic("bos-vs-bos")).toBeNull();
    // unknown team code
    expect(parseMlbSeriesTopic("xxx-vs-yyy")).toBeNull();
    // garbage
    expect(parseMlbSeriesTopic("")).toBeNull();
    expect(parseMlbSeriesTopic("not-a-slug")).toBeNull();
    expect(parseMlbSeriesTopic("bos-vs")).toBeNull();
    // KBO 2-letter 코드는 MLB 3-letter regex 미매칭
    expect(parseMlbSeriesTopic("ht-vs-lg")).toBeNull();
  });

  it("listMlbSeriesTopics — 30 choose 2 = 435 canonical pairs, 모두 distinct", () => {
    const topics = listMlbSeriesTopics();
    expect(topics).toHaveLength(435);

    const slugs = new Set(topics.map((t) => t.slug));
    expect(slugs.size).toBe(435);

    for (const t of topics) {
      const [a, b] = t.slug.split("-vs-");
      expect(a < b).toBe(true);
    }
  });
});

describe("mlb/insights/insights-data.ts — getMlbSeriesByTopic DB join pattern", () => {
  it("mlb_schedule 팀쌍 .or() 필터 선조회 후 predictions in() join (buildMlbMatchupProfile 와 동일 toMlbStatsApiCode 변환 패턴 재사용)", () => {
    expect(DATA_SRC).toMatch(/export async function getMlbSeriesByTopic/);
    expect(DATA_SRC).toMatch(/toMlbStatsApiCode\(topic\.team1\)/);
    expect(DATA_SRC).toMatch(/toMlbStatsApiCode\(topic\.team2\)/);
    expect(DATA_SRC).toMatch(/from\("mlb_schedule"\)/);
    expect(DATA_SRC).toMatch(/\.or\(orFilter\)/);
    expect(DATA_SRC).toMatch(/in\("external_game_id", gameIds\)/);
  });

  it("mapMlbPredictionRows 재사용 (hub/[date] 와 공유, 신규 매핑 재구현 X)", () => {
    expect(DATA_SRC.match(/mapMlbPredictionRows\(/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe("mlb/insights/series/[topic]/page.tsx (ko, plan #30 Phase 3)", () => {
  it("generateStaticParams 없음 — mlb/matchup/[teamA]/[teamB] 선례 재사용 (435쌍 전체 사전렌더 빌드비용 회피, on-demand ISR)", () => {
    expect(SERIES_PAGE_SRC).not.toMatch(/export (async )?function generateStaticParams/);
    expect(SERIES_PAGE_SRC).not.toMatch(/export const dynamicParams/);
    expect(SERIES_PAGE_SRC).toMatch(/export const revalidate = 3600\b/);
  });

  it("topic parse 실패 시만 notFound() — entries 0건은 placeholder 표시 (KBO 패리티)", () => {
    expect(SERIES_PAGE_SRC).toMatch(/if \(!topic\) notFound\(\);/);
    expect(SERIES_PAGE_SRC).not.toMatch(/entries\.length === 0\) notFound\(\)/);
    expect(SERIES_PAGE_SRC).toMatch(/아직 누적된 인사이트가 없습니다/);
  });

  it("Breadcrumb 3단계 (MLB 분석 → AI 인사이트 → 팀 시리즈)", () => {
    expect(SERIES_PAGE_SRC).toMatch(/\{ label: "MLB 분석", href: "\/mlb" \}/);
    expect(SERIES_PAGE_SRC).toMatch(/\{ label: "AI 인사이트", href: "\/mlb\/insights" \}/);
  });

  it("팀 링크는 대문자 코드 그대로 (/mlb/team/[code] 는 lowercase 아님, isMlbTeamCode(code) uppercase 매칭)", () => {
    expect(SERIES_PAGE_SRC).toMatch(/href=\{`\/mlb\/team\/\$\{topic\.team1\}`\}/);
    expect(SERIES_PAGE_SRC).toMatch(/href=\{`\/mlb\/team\/\$\{topic\.team2\}`\}/);
    expect(SERIES_PAGE_SRC).not.toMatch(/topic\.team1\.toLowerCase\(\)/);
  });
});

describe("en/mlb/insights/series/[topic]/page.tsx (en mirror, plan #30 Phase 3)", () => {
  it("공유 insights-data.ts 재사용 (DRY)", () => {
    expect(EN_SERIES_PAGE_SRC).toMatch(
      /import \{\s*getMlbSeriesByTopic,\s*parseMlbSeriesTopic,\s*\} from "@\/app\/mlb\/insights\/insights-data"/,
    );
  });

  it("locale=en Breadcrumb + /en/mlb href", () => {
    expect(EN_SERIES_PAGE_SRC).toMatch(/locale="en"/);
    expect(EN_SERIES_PAGE_SRC).toMatch(/href:\s*"\/en\/mlb"/);
  });

  it("EN canonical + KO alternate 상호 링크", () => {
    expect(EN_SERIES_PAGE_SRC).toMatch(/en\/mlb\/insights\/series/);
    expect(EN_SERIES_PAGE_SRC).toMatch(/ko:\s*`\$\{SITE_URL\}\/mlb\/insights\/series\/\$\{topic\.slug\}`/);
  });
});

describe("sitemap.ts — /mlb/insights/series/[topic] + EN mirror 배선 (plan #30 Phase 3)", () => {
  it("listMlbSeriesTopics import + KO/EN 양쪽 URL 생성", () => {
    expect(SITEMAP_SRC).toMatch(/listMlbSeriesTopics/);
    expect(SITEMAP_SRC).toMatch(/\$\{SITE_URL\}\/mlb\/insights\/series\/\$\{topic\.slug\}`/);
    expect(SITEMAP_SRC).toMatch(/\$\{SITE_URL\}\/en\/mlb\/insights\/series\/\$\{topic\.slug\}`/);
  });

  it("mlbInsightsSeriesRoutes / enMlbInsightsSeriesRoutes 가 최종 반환 배열에 spread", () => {
    expect(SITEMAP_SRC).toMatch(/\.\.\.mlbInsightsSeriesRoutes,/);
    expect(SITEMAP_SRC).toMatch(/\.\.\.enMlbInsightsSeriesRoutes,/);
  });
});
