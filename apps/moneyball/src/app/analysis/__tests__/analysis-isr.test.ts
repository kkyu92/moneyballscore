import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_SRC = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
const GAME_SRC = readFileSync(
  resolve(__dirname, "../game/[id]/page.tsx"),
  "utf8",
);

describe("analysis ANALYSIS_*_ISR_SECONDS source-of-truth guard (silent drift wave 134 cycle 1356)", () => {
  it("analysis/page.tsx revalidate = 3600 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(INDEX_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*3600\b/);
    // build guard: route segment revalidate must be literal not identifier (Next.js 16 Turbopack)
  });

  it("analysis/game/[id]/page.tsx revalidate = 600 literal (Next.js 16 Turbopack: literal required)", () => {
    expect(GAME_SRC).toMatch(/export\s+const\s+revalidate\s*=\s*600\b/);
    // build guard: route segment revalidate must be literal not identifier (Next.js 16 Turbopack)
  });

});

describe("wave-561 완전수렴 배지 FACTOR_PICK_COMPLETE 동기 guard (silent drift wave-562 cycle 1936)", () => {
  it("wave-561 title 에 인라인 '10팩터' 없음 — FACTOR_PICK_COMPLETE 상수 사용", () => {
    // '10팩터 완전수렴 픽' 인라인 하드코딩 차단 — FACTOR_PICK_COMPLETE 변경 시 display text 자동 동기
    expect(INDEX_SRC).not.toMatch(/`10팩터 완전수렴 픽/);
  });

  it("wave-561 span 에 인라인 '10팩터' 없음 — {FACTOR_PICK_COMPLETE}팩터 사용", () => {
    // JSX span literal '10팩터' 차단 — 상수 참조 형식 강제
    expect(INDEX_SRC).not.toMatch(/>10팩터<\/span>/);
  });
});
