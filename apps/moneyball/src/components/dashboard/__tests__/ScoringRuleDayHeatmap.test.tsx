/**
 * ScoringRuleDayHeatmap unit test — cycle 2211 review-code(heavy).
 *
 * 의도: SCORING_RULE_HEATMAP_ROWS 는 KBO era history(v1.5~v1.8-credit-fail)
 * 하드코딩이라, MLB처럼 scoring_rule이 그 목록과 전혀 안 겹치는 데이터(= 'all'
 * aggregate만 채워짐)를 넘기면 기존엔 KBO 버전 라벨이 붙은 빈 "—" 행 5개가
 * 그대로 렌더됐음(자매 컴포넌트 CohortComparisonHeatmap은 이미 activeRows
 * 필터로 이 문제 없음 — 두 컴포넌트 간 parity 누락이 근본 원인).
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ScoringRuleDayHeatmap } from "../ScoringRuleDayHeatmap";
import type { ScoringRuleDayCell } from "@/lib/accuracy/buildAccuracyData";

function allOnlyCell(day: number, n: number, hits: number): ScoringRuleDayCell {
  return {
    scoringRule: "all",
    day,
    n,
    hits,
    accuracy: n > 0 ? hits / n : null,
  };
}

describe("ScoringRuleDayHeatmap", () => {
  it("scoring_rule 이 'all' 만 채워진 데이터(MLB 케이스)는 'all' 행만 렌더 — KBO era 빈 행 미노출", () => {
    const data: ScoringRuleDayCell[] = [
      allOnlyCell(1, 5, 3),
      allOnlyCell(2, 4, 2),
    ];
    const { container } = render(<ScoringRuleDayHeatmap data={data} />);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain("전체");
    expect(container.textContent).not.toContain("v1.5");
    expect(container.textContent).not.toContain("v1.8-credit-fail");
  });

  it("KBO 처럼 여러 scoring_rule 이 실제 데이터를 가지면 해당 행 모두 렌더", () => {
    const data: ScoringRuleDayCell[] = [
      allOnlyCell(1, 5, 3),
      { scoringRule: "v1.8", day: 1, n: 5, hits: 3, accuracy: 0.6 },
    ];
    const { container } = render(<ScoringRuleDayHeatmap data={data} />);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);
    expect(container.textContent).toContain("v1.8");
  });
});
