import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

describe("standings 팀별 예측 적중률 소표본 hedge (cycle 2463 review-code heavy — teams/reviews 페이지엔 있으나 standings 만 누락됐던 SMALL_SAMPLE_N family gap)", () => {
  it("SMALL_SAMPLE_N import", () => {
    expect(PAGE_SRC).toMatch(/SMALL_SAMPLE_N/);
  });

  it("verifiedN >= SMALL_SAMPLE_N 기준 isReliable 판정", () => {
    expect(PAGE_SRC).toMatch(/isReliable\s*=\s*row\.verifiedN\s*>=\s*SMALL_SAMPLE_N/);
  });

  it("소표본일 때 참고용 라벨 표시", () => {
    expect(PAGE_SRC).toMatch(/!isReliable[\s\S]{0,80}참고용/);
  });
});
