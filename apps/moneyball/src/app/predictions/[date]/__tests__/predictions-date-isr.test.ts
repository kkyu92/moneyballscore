import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

describe("predictions/[date] PREDICTIONS_ISR_SECONDS source-of-truth guard (silent drift family wave 175 cycle 1425)", () => {
  it("predictions/[date]/page.tsx revalidate = 300 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(PAGE_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*300\b/);
  });
});

describe("predictions/[date] cancelled-inclusive accuracy convention (cycle 2190 review-code heavy)", () => {
  // buildIntro/buildArticleJsonLd 는 취소 경기를 적중으로 집계 (line 192 comment).
  // 헤더/footer share/DailyPredictionSummaryBar 가 correct.length/verified.length
  // (취소 미포함) 를 그대로 쓰면 같은 페이지 안 취소 경기 있는 날짜에 서로 다른
  // 적중률 %가 동시 노출된다 — correctN/totalN 단일 소스로 통일.
  it("header/footer/summary-bar all read correctN/totalN, not correct.length/verified.length", () => {
    expect(PAGE_SRC).toMatch(/const correctN = correct\.length \+ cancelled\.length/);
    expect(PAGE_SRC).toMatch(/const totalN = verified\.length \+ cancelled\.length/);
    expect(PAGE_SRC).not.toMatch(/correct\.length \/ verified\.length/);
  });
});
