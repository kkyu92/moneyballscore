import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

// reviews/monthly/[month]/__tests__/reviews-monthly-isr.test.ts(KBO) 의 MLB 대응
// (plan #26 Phase 2) — REVIEWS_MONTHLY_ISR_SECONDS = 3600 literal guard (Next.js 16
// Turbopack: literal required, KBO monthly 페이지와 동일 리터럴 사용).
describe("mlb/reviews/monthly/[month] REVIEWS_MONTHLY_ISR_SECONDS source-of-truth guard", () => {
  it("mlb/reviews/monthly/[month]/page.tsx revalidate = 3600 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*3600\b/);
  });
});
