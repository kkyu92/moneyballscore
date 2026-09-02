/**
 * TeamMatchupCards unit test — cycle 2199 review-code(heavy), threshold 정정 cycle 2499.
 *
 * 의도: 소표본(N<SMALL_SAMPLE_N) 회색 처리가 이 컴포넌트에 일관 적용되는지 검증.
 * cycle 2499: 하드코딩 `n<3` 이 SMALL_SAMPLE_N(=5, sweep 51 source-of-truth) 미참조 drift 로
 * 확인돼 정정 — 원 커밋의 "ScoringRuleDayHeatmap/CohortComparisonHeatmap 과 동일 컨벤션" 주석은
 * 두 파일 모두 이 threshold 를 쓰지 않아 실제로는 부정확한 근거였음.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SMALL_SAMPLE_N } from "@moneyball/shared";
import { TeamMatchupCards } from "../TeamMatchupCards";

describe("TeamMatchupCards", () => {
  it("상대팀 n<SMALL_SAMPLE_N 소표본은 opacity-50, n>=SMALL_SAMPLE_N 은 정상 렌더", () => {
    const { container } = render(
      <TeamMatchupCards
        matchups={[
          { teamCode: "LG", opponentCode: "KIA", n: SMALL_SAMPLE_N - 1, correct: 1, accuracyRate: 0.5 },
          { teamCode: "LG", opponentCode: "SSG", n: SMALL_SAMPLE_N, correct: 3, accuracyRate: 0.6 },
        ]}
        homeAway={[]}
        teamAccuracy={[]}
        teamCodes={["LG"]}
        shortName={(c) => c}
      />,
    );
    // accuracyRate 내림차순 정렬 — SSG(n=5, 0.6) 먼저, KIA(n=4, 0.5) 다음
    const rows = container.querySelectorAll(".border-t > div");
    expect(rows[0].className).not.toContain("opacity-50");
    expect(rows[1].className).toContain("opacity-50");
  });

  it("홈/원정 split 도 N<SMALL_SAMPLE_N 소표본 시 opacity-50 (기존엔 표본 크기 무관 항상 진하게 렌더 — drift)", () => {
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

  it("팀명 span 은 whitespace-nowrap — 2col 모바일 grid 좁은 폭에서 한글 단어 중간 줄바꿈 방지 (Korean wrap bug family)", () => {
    const { container } = render(
      <TeamMatchupCards
        matchups={[{ teamCode: "LG", opponentCode: "KIA", n: SMALL_SAMPLE_N, correct: 3, accuracyRate: 0.6 }]}
        homeAway={[]}
        teamAccuracy={[]}
        teamCodes={["LG"]}
      />,
    );
    const header = container.querySelector(".font-bold.text-sm");
    expect(header?.className).toContain("whitespace-nowrap");
    const opponentRow = container.querySelector(".text-gray-600.dark\\:text-gray-400");
    expect(opponentRow?.className).toContain("whitespace-nowrap");
  });
});
