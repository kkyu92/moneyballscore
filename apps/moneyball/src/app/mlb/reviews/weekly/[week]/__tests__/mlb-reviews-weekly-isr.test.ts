import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

// reviews/weekly/[week]/__tests__/reviews-weekly-isr.test.ts(KBO) 의 MLB 대응 (plan #26
// Phase 1b) — MLB_LIVE_ISR_SECONDS = 1800 literal guard (Next.js 16 Turbopack: literal
// required, 다른 /mlb/* 페이지 전부 동일 리터럴 사용).
describe("mlb/reviews/weekly/[week] MLB_LIVE_ISR_SECONDS source-of-truth guard", () => {
  it("mlb/reviews/weekly/[week]/page.tsx revalidate = 1800 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*1800\b/);
  });
});
