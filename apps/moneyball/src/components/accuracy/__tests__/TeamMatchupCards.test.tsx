/**
 * TeamMatchupCards unit test — cycle 2199 review-code(heavy).
 *
 * 의도: 소표본(N<3) 회색 처리 컨벤션(ScoringRuleDayHeatmap/CohortComparisonHeatmap 과 동일)이
 * 이 컴포넌트에도 일관 적용되는지 검증 — 기존엔 상대팀 목록만 n===1 에 opacity-50, 홈/원정
 * split 은 표본 크기 무관 항상 진하게 렌더되던 drift 를 잡는 회귀 테스트.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TeamMatchupCards } from "../TeamMatchupCards";

describe("TeamMatchupCards", () => {
  it("상대팀 n<3 소표본은 opacity-50, n>=3 은 정상 렌더", () => {
    const { container } = render(
      <TeamMatchupCards
        matchups={[
          { teamCode: "LG", opponentCode: "KIA", n: 2, correct: 1, accuracyRate: 0.5 },
          { teamCode: "LG", opponentCode: "SSG", n: 3, correct: 2, accuracyRate: 0.667 },
        ]}
        homeAway={[]}
        teamAccuracy={[]}
        teamCodes={["LG"]}
        shortName={(c) => c}
      />,
    );
    // accuracyRate 내림차순 정렬 — SSG(n=3, 0.667) 먼저, KIA(n=2, 0.5) 다음
    const rows = container.querySelectorAll(".border-t > div");
    expect(rows[0].className).not.toContain("opacity-50");
    expect(rows[1].className).toContain("opacity-50");
  });

  it("홈/원정 split 도 N<3 소표본 시 opacity-50 (기존엔 표본 크기 무관 항상 진하게 렌더 — drift)", () => {
    const { container } = render(
      <TeamMatchupCards
        matchups={[]}
        homeAway={[
          { teamCode: "LG", homeN: 1, homeAccuracy: 1, awayN: 5, awayAccuracy: 0.6 },
        ]}
        teamAccuracy={[]}
        teamCodes={["LG"]}
        shortName={(c) => c}
      />,
    );
    const [homeRow, awayRow] = container.querySelectorAll(".space-y-0\\.5 > .flex.justify-between");
    expect(homeRow.className).toContain("opacity-50");
    expect(awayRow.className).not.toContain("opacity-50");
  });
});
