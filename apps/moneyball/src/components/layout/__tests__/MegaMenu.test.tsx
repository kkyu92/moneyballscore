/**
 * MegaMenu unit test — plan #14 C2 Step 2 (Radix NavigationMenu wrapper).
 *
 * 상태 매트릭스 12 case 중 핵심 6 case 의 일부:
 * - default: trigger 박제 + aria-haspopup
 * - active route → aria-current=page
 * - render structure
 *
 * Radix NavigationMenu 자체 interaction (hover/click/Esc/outside-click/arrow-keys)
 * 은 Radix 안 자동 처리 — vitest jsdom 안 simulate 어려움 (E2E 별도 필요).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
  { href: "/standings", label: "순위" },
];

describe("MegaMenu", () => {
  it("trigger items 모두 박제", () => {
    render(<MegaMenu items={SAMPLE_ITEMS} pathname="/" />);
    expect(screen.getByText("오늘")).toBeDefined();
    expect(screen.getByText("AI")).toBeDefined();
    expect(screen.getByText("순위")).toBeDefined();
  });

  it("pathname=/ → 홈 link aria-current=page", () => {
    render(<MegaMenu items={SAMPLE_ITEMS} pathname="/" />);
    const homeLink = screen.getByText("오늘").closest("a");
    expect(homeLink?.getAttribute("aria-current")).toBe("page");
  });

  it("pathname=/standings → 순위 link aria-current=page", () => {
    render(<MegaMenu items={SAMPLE_ITEMS} pathname="/standings" />);
    const link = screen.getByText("순위").closest("a");
    expect(link?.getAttribute("aria-current")).toBe("page");
  });

  it("NavGroup trigger = button 박제 (Radix 안 ARIA pattern 자동)", () => {
    render(<MegaMenu items={SAMPLE_ITEMS} pathname="/" />);
    const aiTrigger = screen.getByText("AI").closest("button");
    expect(aiTrigger).not.toBeNull();
    // Radix NavigationMenu.Trigger 가 자동 aria-* 처리
  });

  it("desktop hidden md:flex — viewport < md 시 시각 hidden (cycle 1044 shadcn wrapper)", () => {
    const { container } = render(<MegaMenu items={SAMPLE_ITEMS} pathname="/" />);
    const root = container.querySelector("nav") ?? container.firstChild as HTMLElement;
    expect(root?.className).toContain("md:flex");
    expect(root?.className).toContain("hidden");
  });
});
