import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");

// reviews/weekly/[week]/__tests__/reviews-weekly-page.test.ts(KBO) 의 MLB 대응 (plan #26
// Phase 1b) — 동일 SMALL_SAMPLE_N source-of-truth guard. mlb/reviews/weekly/[week]/page.tsx
// 도 KBO 와 동일 팀별 소표본 hedge 로직(predicted < SMALL_SAMPLE_N)을 그대로 포함하므로
// 동일 회귀 가드가 유효.
describe("mlb/reviews/weekly/[week]/page.tsx SMALL_SAMPLE_N source-of-truth guard", () => {
  it("predicted < 5 hardcoded 부재 — SMALL_SAMPLE_N import 사용", () => {
    expect(PAGE_SRC).not.toMatch(/predicted\s*<\s*5\b/);
  });

  it("hedge label 자연어 '(5경기 이상부터' hardcoded 부재 — ${SMALL_SAMPLE_N}경기 사용", () => {
    expect(PAGE_SRC).not.toMatch(/\(5경기 이상부터/);
    expect(PAGE_SRC).toMatch(/\$\{SMALL_SAMPLE_N\}경기 이상부터/);
  });

  it("개별 경기 링크는 /mlb/games/[date]/[home]-vs-[away] slug 사용 (KBO /analysis/game/[id] href 아님)", () => {
    expect(PAGE_SRC).toMatch(/\/mlb\/games\/\$\{g\.gameDate\}\/\$\{g\.homeCode\}-vs-\$\{g\.awayCode\}/);
    // href={`/analysis/game/...`} 형태의 실제 링크 사용만 배제 (주석 내 비교 서술은 허용).
    expect(PAGE_SRC).not.toMatch(/href=\{`\/analysis\/game\//);
  });
});
