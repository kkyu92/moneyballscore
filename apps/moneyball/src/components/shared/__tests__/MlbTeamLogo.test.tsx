/**
 * MlbTeamLogo 회귀 가드 — cycle 2737 fix-incident.
 *
 * Sentry MONEYBALLSCORE-1B: normalizeMlbTeamCode 매핑 밖 미인식 코드가
 * mlb-shared.ts 의 `?? (code as MlbTeamCode)` fallback 을 통해 캐스팅으로 통과하면
 * MLB_TEAMS[team] 조회가 undefined 를 반환 — `teamInfo.name` 접근이 크래시.
 * GET /en/mlb/reviews/weekly/[week] 에서 3회 관측.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MlbTeamLogo } from "../MlbTeamLogo";
import type { MlbTeamCode } from "@moneyball/shared";

describe("MlbTeamLogo", () => {
  it("정상 team code 는 실제 팀명을 alt 로 렌더한다", () => {
    render(<MlbTeamLogo team={"LAD" as MlbTeamCode} />);
    expect(screen.getByAltText(/로고/)).toBeInTheDocument();
  });

  it("미인식 team code 로도 크래시 없이 렌더한다 (Sentry MONEYBALLSCORE-1B 회귀 차단)", () => {
    expect(() =>
      render(<MlbTeamLogo team={"XX" as MlbTeamCode} />),
    ).not.toThrow();
  });
});
