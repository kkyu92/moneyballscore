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

  it("로또 column 의 4 link (이번 주 조합 / 조합 검증 / 통계 방법론 / 아카이브) 박제 — /lotto 최상위 hub 포함 (cycle 2022 IA gap fix, cycle 2587 /lotto/check 추가)", () => {
    render(<Footer />);
    const lottoHeading = screen.getByRole("heading", { level: 2, name: "로또" });
    const lottoColumn = lottoHeading.closest("details") as HTMLElement;
    expect(lottoColumn).not.toBeNull();
    expect(within(lottoColumn).getByRole("link", { name: "이번 주 조합" })).toHaveAttribute("href", "/lotto");
    expect(within(lottoColumn).getByRole("link", { name: "조합 검증" })).toHaveAttribute("href", "/lotto/check");
    expect(within(lottoColumn).getByRole("link", { name: "통계 방법론" })).toHaveAttribute("href", "/lotto/methodology");
    expect(within(lottoColumn).getByRole("link", { name: "아카이브" })).toHaveAttribute("href", "/lotto/archive");
  });

  it("MLB column 에 /mlb/matchup link 박제 (cycle 2225 IA gap fix — 헤더 megamenu·sitemap.xml 엔 있었으나 footer 만 누락)", () => {
    render(<Footer />);
    const mlbHeading = screen.getByRole("heading", { level: 2, name: "MLB" });
    const mlbColumn = mlbHeading.closest("details") as HTMLElement;
    expect(within(mlbColumn).getByRole("link", { name: "매치업" })).toHaveAttribute("href", "/mlb/matchup");
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

  it("isEn=true 시 사이트맵/법적 고지 aria-label + column heading + tagline/disclaimer EN 치환", () => {
    render(<Footer isEn />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("navigation", { name: "Sitemap" })).toBeInTheDocument();
    expect(within(footer).getByRole("navigation", { name: "Legal" })).toBeInTheDocument();
    const titles = ["AI Predictions", "Community", "Teams & Players", "Reviews & Seasons", "Help", "MLB", "Lotto"];
    for (const title of titles) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    }
    expect(screen.getByText("Sabermetrics-based KBO game prediction service")).toBeInTheDocument();
    expect(
      screen.getByText("Predictions are statistical model estimates and do not guarantee actual results.")
    ).toBeInTheDocument();
  });

  it("isEn=true 시 legal link 텍스트 EN 치환, href 는 /privacy /terms /contact 그대로 (no /en 대응 라우트)", () => {
    render(<Footer isEn />);
    const legal = screen.getByRole("navigation", { name: "Legal" });
    expect(within(legal).getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(within(legal).getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
    expect(within(legal).getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
  });

  it("isEn=true 시 MLB column href 만 /en 접두 치환, 나머지 column href 는 유지 (Header withLocale 과 동일 scope)", () => {
    render(<Footer isEn />);
    const mlbHeading = screen.getByRole("heading", { level: 2, name: "MLB" });
    const mlbColumn = mlbHeading.closest("details") as HTMLElement;
    expect(within(mlbColumn).getByRole("link", { name: "Today's Games" })).toHaveAttribute("href", "/en/mlb");
    expect(within(mlbColumn).getByRole("link", { name: "AL/NL Standings" })).toHaveAttribute(
      "href",
      "/en/mlb/standings"
    );

    const aiHeading = screen.getByRole("heading", { level: 2, name: "AI Predictions" });
    const aiColumn = aiHeading.closest("details") as HTMLElement;
    expect(within(aiColumn).getByRole("link", { name: "Today's Games" })).toHaveAttribute("href", "/");
  });

  it("isEn=true 시 /mlb/reviews, /mlb/reviews/misses, /mlb/reviews/weekly, /mlb/reviews/monthly 전부 /en 치환됨 (cycle 2355/2356 미러 신규로 예외 해제)", () => {
    render(<Footer isEn />);
    const mlbHeading = screen.getByRole("heading", { level: 2, name: "MLB" });
    const mlbColumn = mlbHeading.closest("details") as HTMLElement;
    expect(within(mlbColumn).getByRole("link", { name: "Prediction Review" })).toHaveAttribute("href", "/en/mlb/reviews");
    expect(within(mlbColumn).getByRole("link", { name: "Missed Predictions" })).toHaveAttribute(
      "href",
      "/en/mlb/reviews/misses"
    );
    expect(within(mlbColumn).getByRole("link", { name: "Weekly Review" })).toHaveAttribute("href", "/en/mlb/reviews/weekly");
    expect(within(mlbColumn).getByRole("link", { name: "Monthly Review" })).toHaveAttribute("href", "/en/mlb/reviews/monthly");
  });
});
