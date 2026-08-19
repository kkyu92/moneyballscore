import { describe, expect, it } from "vitest";
import { CURRENT_MODEL_FILTER } from "../model";
import { CURRENT_SCORING_RULE } from "@moneyball/shared";

// wave-656: CURRENT_MODEL_FILTER 가 debate_version 기준이면 CE(CREDIT_EXHAUSTED)
// fallback row(debate_version=null, decideModelVersion 양쪽 분기 공통)가 .match()
// 등가 비교에서 조용히 제외된다 — /accuracy 등 14개 사용처의 baseline 이 debate
// 성공 row 로만 고정(2026-07-01 이후 신규 verified 0건, DB 실측 확인). scoring_rule
// 기준(decideModelVersion 이 성공/실패 양쪽 다 CURRENT_SCORING_RULE 박제)으로
// 정정해 CE row 도 포함하는지 회귀 가드.
describe("CURRENT_MODEL_FILTER — wave-656 CE fallback 포함 회귀 가드", () => {
  it("scoring_rule 기준(CE row 의 debate_version=null 과 무관하게 매칭됨)", () => {
    expect(CURRENT_MODEL_FILTER).toEqual({ scoring_rule: CURRENT_SCORING_RULE });
    expect(CURRENT_MODEL_FILTER).not.toHaveProperty("debate_version");
  });
});
