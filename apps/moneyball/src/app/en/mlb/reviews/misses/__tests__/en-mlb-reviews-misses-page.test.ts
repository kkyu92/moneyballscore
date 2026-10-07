import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

// cycle 2988 review-code(heavy): ShareButtons isEn 누락 — EN 페이지인데 공유 버튼 라벨이
// 한글("공유"/"링크 복사")로 렌더됨. matchup/games EN 페이지는 isEn 배선돼있었는데
// reviews 3종(misses/monthly/weekly)만 누락.
describe("en/mlb/reviews/misses/page.tsx ShareButtons isEn wiring", () => {
  it("ShareButtons isEn 배선 — 영문 페이지에 한글 공유 라벨 노출 방지", () => {
    expect(PAGE_SRC).toMatch(/<ShareButtons[\s\S]*?isEn[\s\S]*?\/>/);
  });
});
