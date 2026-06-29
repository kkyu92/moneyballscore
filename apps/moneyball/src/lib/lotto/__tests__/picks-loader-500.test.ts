import { describe, it, expect } from "vitest";
import { parseLottoPicksMd } from "../picks-loader";
import { LOTTO_PICK_COUNT, LOTTO_TOP_PICK_COUNT } from "@moneyball/shared";

const SAMPLE_MD = `# 2026-07-04 (토) 추첨 ${LOTTO_PICK_COUNT}세트 추천 (1231회)

**생성 시각**: 2026-06-29 04:50:00 UTC (cron 자동 갱신)
**필터링 룰**: 256개 100% 규칙

상위 ${LOTTO_TOP_PICK_COUNT}세트 = 기피점수 desc 추천.

## ${LOTTO_PICK_COUNT}세트 전체

| # | 번호 | 합 | 홀:짝 | 연속쌍 | 기피점수 |
|---|---|---|---|---|---|
${Array.from({ length: 3 }, (_, i) => `| ${i + 1} | 1 2 3 4 5 6 | 21 | 3:3 | 3 | ${(10 - i).toFixed(1)} |`).join("\n")}
`;

describe("parseLottoPicksMd (cycle 1403 — 500세트 확장)", () => {
  it("단일 테이블 parse — 중복 idx 없이 sets 박제", () => {
    const parsed = parseLottoPicksMd(SAMPLE_MD);
    expect(parsed.drawNo).toBe(1231);
    expect(parsed.sets.length).toBe(3);
    expect(parsed.sets[0].idx).toBe(1);
    expect(parsed.sets[2].idx).toBe(3);
    const idxes = parsed.sets.map((s) => s.idx);
    expect(new Set(idxes).size).toBe(idxes.length);
  });

  it(`shared 상수 LOTTO_PICK_COUNT=500 + LOTTO_TOP_PICK_COUNT=10`, () => {
    expect(LOTTO_PICK_COUNT).toBe(500);
    expect(LOTTO_TOP_PICK_COUNT).toBe(10);
  });
});
