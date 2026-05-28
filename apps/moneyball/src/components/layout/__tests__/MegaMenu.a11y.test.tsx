/**
 * MegaMenu a11y test — plan #14 C2 Step 4 (axe-core integration).
 *
 * vitest-axe + axe-core 로 a11y violation 0 검증.
 * Radix NavigationMenu 가 WAI-ARIA Authoring Practices menubar pattern 자동
 * 적용하므로 violation 없어야 정상.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { MegaMenu } from "../MegaMenu";
import type { NavItem } from "../Header";

const SAMPLE_ITEMS: NavItem[] = [
  { href: "/", label: "오늘" },
  {
    label: "AI",
    items: [
      { href: "/analysis", label: "AI 분석", description: "에이전트 토론·경기 분석" },
      { href: "/accuracy", label: "적중 기록", description: "AI 예측 성과 트래킹" },
    ],
  },
  {
    label: "팀·선수",
    items: [
      { href: "/teams", label: "팀", description: "KBO 10구단 프로필·통계" },
      { href: "/players", label: "선수", description: "선수 세이버메트릭스 지표" },
    ],
  },
  { href: "/standings", label: "순위" },
];

describe("MegaMenu a11y", () => {
  it("axe-core violation 0 (default state)", async () => {
    const { container } = render(<MegaMenu items={SAMPLE_ITEMS} pathname="/" />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("axe-core violation 0 (active route)", async () => {
    const { container } = render(<MegaMenu items={SAMPLE_ITEMS} pathname="/analysis" />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("axe-core violation 0 (sub-route active)", async () => {
    const { container } = render(<MegaMenu items={SAMPLE_ITEMS} pathname="/teams/LG" />);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
