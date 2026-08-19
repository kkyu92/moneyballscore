import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

// reviews/monthly/[month]/__tests__/reviews-monthly-page.test.ts(KBO) +
// mlb/reviews/weekly/[week]/__tests__/mlb-reviews-weekly-page.test.ts 의 MLB 월간
// 대응 (plan #26 Phase 2) — 동일 SMALL_SAMPLE_N source-of-truth guard.
describe("mlb/reviews/monthly/[month]/page.tsx SMALL_SAMPLE_N source-of-truth guard", () => {
  it("predicted < 5 hardcoded 부재 — SMALL_SAMPLE_N import 사용", () => {
    expect(PAGE_SRC).not.toMatch(/predicted\s*<\s*5\b/);
  });

  it("hedge label 자연어 '(5경기 이상부터' hardcoded 부재 — ${SMALL_SAMPLE_N}경기 사용", () => {
    expect(PAGE_SRC).not.toMatch(/\(5경기 이상부터/);
    expect(PAGE_SRC).toMatch(/\$\{SMALL_SAMPLE_N\}경기 이상부터/);
  });

  it("수렴 픽(강수렴/완전수렴) 섹션 부재 — MLB convergence 함수는 날짜 range 미지원이라 의도적 생략", () => {
    expect(PAGE_SRC).not.toMatch(/getMlbRecentConvergencePickRecord/);
    expect(PAGE_SRC).not.toMatch(/getMlbConvergencePickStreak/);
  });
});
