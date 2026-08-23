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

  // cycle 2345: MLB convergence 함수(convergenceRecord.ts)에 startDate/endDate 파라미터가
  // 추가돼 KBO monthly 와 동일하게 월간 범위 한정 수렴 픽 섹션이 배선됨 — 과거 "날짜 range
  // 미지원이라 의도적 생략" 가드를 역으로 뒤집어 배선 유지 회귀 가드로 전환.
  it("수렴 픽(강수렴/완전수렴) 섹션 배선 — range.startDate/endDate 전달", () => {
    expect(PAGE_SRC).toMatch(/getMlbRecentConvergencePickRecord\(MLB_FACTOR_PICK_STRONG, range\.startDate, range\.endDate\)/);
    expect(PAGE_SRC).toMatch(/getMlbConvergencePickStreak\(MLB_FACTOR_PICK_STRONG, range\.startDate, range\.endDate\)/);
    expect(PAGE_SRC).toMatch(/getMlbConvergencePickDayOfWeekSplit/);
  });
});
