import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

// mlb/reviews/monthly/[month]/__tests__/mlb-reviews-monthly-page.test.ts(KO) 의 EN 대응
// (cycle 2356) — 동일 SMALL_SAMPLE_N source-of-truth guard 재사용 + locale='en' 배선
// (buildMlbMonthlyReview/MlbHighlightCard/MonthlyTeamStatsSortControl/Convergence 배지
// 3종) + hreflang alternates 회귀 가드 (en/mlb/reviews/weekly EN 테스트와 동일 패턴).
describe("en/mlb/reviews/monthly/[month]/page.tsx SMALL_SAMPLE_N source-of-truth guard", () => {
  it("predicted < 5 hardcoded 부재 — SMALL_SAMPLE_N import 사용", () => {
    expect(PAGE_SRC).not.toMatch(/predicted\s*<\s*5\b/);
  });

  it("hedge label hardcoded 부재 — ${SMALL_SAMPLE_N} 사용", () => {
    expect(PAGE_SRC).toMatch(/\$\{SMALL_SAMPLE_N\}\+/);
  });

  it("hreflang en/ko alternates present", () => {
    expect(PAGE_SRC).toMatch(/en:\s*url/);
    expect(PAGE_SRC).toMatch(/ko:\s*`\$\{SITE_URL\}\/mlb\/reviews\/monthly/);
  });

  it("buildMlbMonthlyReview locale='en' 배선", () => {
    expect(PAGE_SRC).toMatch(/buildMlbMonthlyReview\(range,\s*"en"\)/);
  });

  it("locale='en' prop 이 5개 이상 컴포넌트에 배선됨(Breadcrumb/ConvergenceHomeAwayBadges/ConvergenceDayOfWeekBadges/ConvergenceTeamStatsBadges/MlbHighlightCard/MonthlyTeamStatsSortControl)", () => {
    expect(PAGE_SRC.match(/locale="en"/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("수렴 픽(강수렴/완전수렴) 섹션 배선 — range.startDate/endDate 전달", () => {
    expect(PAGE_SRC).toMatch(/getMlbRecentConvergencePickRecord\(MLB_FACTOR_PICK_STRONG, range\.startDate, range\.endDate\)/);
    expect(PAGE_SRC).toMatch(/getMlbConvergencePickDayOfWeekSplit/);
  });

  it("revalidate = 3600 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*3600\b/);
  });
});
