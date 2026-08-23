import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

// mlb/reviews/weekly/[week]/__tests__/mlb-reviews-weekly-page.test.ts(KO) 의 EN 대응
// (wave-660, cycle 2355) — 동일 SMALL_SAMPLE_N source-of-truth guard 재사용 + locale='en'
// 배선(buildMlbWeeklyReview/MlbHighlightCard/WeeklyGamesSortControl/Convergence 배지 4종)
// + hreflang alternates 회귀 가드.
describe("en/mlb/reviews/weekly/[week]/page.tsx SMALL_SAMPLE_N source-of-truth guard", () => {
  it("predicted < 5 hardcoded 부재 — SMALL_SAMPLE_N import 사용", () => {
    expect(PAGE_SRC).not.toMatch(/predicted\s*<\s*5\b/);
  });

  it("hedge label hardcoded 부재 — ${SMALL_SAMPLE_N} 사용", () => {
    expect(PAGE_SRC).toMatch(/\$\{SMALL_SAMPLE_N\}\+/);
  });

  it("개별 경기 링크는 /en/mlb/games/[date]/[home]-vs-[away] slug 사용", () => {
    expect(PAGE_SRC).toMatch(/\/en\/mlb\/games\/\$\{g\.gameDate\}\/\$\{g\.homeCode\}-vs-\$\{g\.awayCode\}/);
  });

  it("hreflang en/ko alternates present", () => {
    expect(PAGE_SRC).toMatch(/en:\s*url/);
    expect(PAGE_SRC).toMatch(/ko:\s*`\$\{SITE_URL\}\/mlb\/reviews\/weekly/);
  });

  it("buildMlbWeeklyReview locale='en' 배선", () => {
    expect(PAGE_SRC).toMatch(/buildMlbWeeklyReview\(range,\s*"en"\)/);
  });

  it("locale='en' prop 이 4개 컴포넌트에 배선됨(ConvergenceHomeAwayBadges/ConvergenceTeamStatsBadges/MlbHighlightCard/WeeklyGamesSortControl)", () => {
    expect(PAGE_SRC.match(/locale="en"/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("revalidate = 1800 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*1800\b/);
  });
});
