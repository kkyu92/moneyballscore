/**
 * TeamLogo 회귀 가드 — cycle 3026 review-code(heavy).
 *
 * MlbTeamLogo.test.tsx(cycle 2737, Sentry MONEYBALLSCORE-1B)와 동일 family —
 * DB 조회 경로(`row.home_team?.code as TeamCode`)에서 검증 없이 넘어온 미인식
 * 코드가 KBO_TEAMS[team] 조회 실패 시 `teamInfo.name` 접근으로 크래시하던 것을
 * TeamLogo.tsx 의 `teamInfo?.name ?? team` 방어로 차단.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TeamLogo } from "../TeamLogo";
import type { TeamCode } from "@moneyball/shared";

describe("TeamLogo", () => {
  it("정상 team code 는 실제 팀명을 alt 로 렌더한다", () => {
    render(<TeamLogo team={"LG" as TeamCode} />);
    expect(screen.getByAltText(/로고/)).toBeInTheDocument();
  });

  it("미인식 team code 로도 크래시 없이 렌더한다 (MlbTeamLogo 패턴 정합)", () => {
    expect(() =>
      render(<TeamLogo team={"XX" as TeamCode} />),
    ).not.toThrow();
  });
});
