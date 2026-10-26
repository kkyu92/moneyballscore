/**
 * CohortComparisonHeatmap unit test — cycle 3661 review-code(heavy).
 * en locale 'all' 행 라벨 한국어 누수 + legend 의 디자인 토큰명(brand-700 등) 사용자 노출 회귀 차단.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CohortComparisonHeatmap } from "../CohortComparisonHeatmap";
import type { ScoringRuleWeekCell } from "@/lib/accuracy/buildAccuracyData";

const data: ScoringRuleWeekCell[] = [
  { scoringRule: "all", weekStart: "2026-10-05", weekLabel: "10/5 주", n: 5, hits: 3, accuracy: 0.6 },
];

describe("CohortComparisonHeatmap", () => {
  it("en locale: 'all' 행은 'All', 한국어 '전체'/'주' 미노출", () => {
    const { container } = render(<CohortComparisonHeatmap data={data} locale="en" />);
    expect(container.textContent).toContain("All");
    expect(container.textContent).not.toContain("전체");
    expect(container.textContent).not.toContain("주");
  });

  it("ko locale: 'all' 행은 '전체'", () => {
    const { container } = render(<CohortComparisonHeatmap data={data} />);
    expect(container.querySelector("tbody tr")?.textContent).toContain("전체");
  });

  it.each(["ko", "en"] as const)("%s legend 에 디자인 토큰명(brand-NNN) 미노출", (locale) => {
    const { container } = render(<CohortComparisonHeatmap data={data} locale={locale} />);
    expect(container.textContent).not.toMatch(/brand-\d+/);
  });
});
