/**
 * Footer unit test — plan #19 Step 4 (cycle 1046).
 *
 * 의도: Footer sitemap 7 column structure + accordion summary + keyboard nav 검증.
 */

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Footer } from "../Footer";

describe("Footer", () => {
  it("contentinfo role + sitemap aria-label 박제", () => {
    render(<Footer />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
    const sitemap = within(footer).getByRole("navigation", { name: "사이트맵" });
    expect(sitemap).toBeInTheDocument();
  });

  it("7 column heading (AI 예측 / 커뮤니티 / 팀·선수 / 리뷰·시즌 / 도움말 / MLB / 로또) 박제", () => {
    render(<Footer />);
    const titles = ["AI 예측", "커뮤니티", "팀·선수", "리뷰·시즌", "도움말", "MLB", "로또"];
    for (const title of titles) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    }
  });

  it("AI 예측 column 의 6 link (오늘 경기 / AI 분석 / AI 적중 기록 / 모델 성능 / 예측 기록 / 월별 캘린더) 박제", () => {
    render(<Footer />);
    const aiHeading = screen.getByRole("heading", { level: 2, name: "AI 예측" });
    const aiColumn = aiHeading.closest("details") as HTMLElement;
    expect(aiColumn).not.toBeNull();
    expect(within(aiColumn).getByRole("link", { name: "오늘 경기" })).toHaveAttribute("href", "/");
    expect(within(aiColumn).getByRole("link", { name: "AI 분석" })).toHaveAttribute("href", "/analysis");
    expect(within(aiColumn).getByRole("link", { name: "AI 적중 기록" })).toHaveAttribute("href", "/accuracy");
    expect(within(aiColumn).getByRole("link", { name: "모델 성능" })).toHaveAttribute("href", "/dashboard");
    expect(within(aiColumn).getByRole("link", { name: "예측 기록" })).toHaveAttribute("href", "/predictions");
    expect(within(aiColumn).getByRole("link", { name: "월별 캘린더" })).toHaveAttribute("href", "/calendar");
  });

  it("법적 고지 nav 에 개인정보처리방침 / 이용약관 / 문의 link 박제", () => {
    render(<Footer />);
    const legal = screen.getByRole("navigation", { name: "법적 고지" });
    expect(within(legal).getByRole("link", { name: "개인정보처리방침" })).toHaveAttribute("href", "/privacy");
    expect(within(legal).getByRole("link", { name: "이용약관" })).toHaveAttribute("href", "/terms");
    expect(within(legal).getByRole("link", { name: "문의" })).toHaveAttribute("href", "/contact");
  });

  it("accordion details default open 박제 (open attribute)", () => {
    const { container } = render(<Footer />);
    const detailsList = container.querySelectorAll("details");
    expect(detailsList.length).toBe(7);
    detailsList.forEach((d) => expect(d).toHaveAttribute("open"));
  });

  it("focus-visible outline 박제 (focusable link 1+ 존재)", () => {
    render(<Footer />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.className).toMatch(/focus-visible:/);
    }
  });
});
