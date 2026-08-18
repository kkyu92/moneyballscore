/**
 * ShareButtons unit test — cycle 2147 review-code(heavy).
 *
 * 의도: EN 페이지(en/mlb/games/[date]/[slug], en/mlb/matchup) 가 ShareButtons 를
 * 렌더하지만 isEn prop 자체가 부재해 "공유"/"Twitter에 공유"/"링크 복사" 등이
 * EN 방문자에게 그대로 노출되던 gap — wave 627~630(CookieConsent/ThemeToggle/
 * Footer/SearchForm) 과 동일 drift family. isEn 신규 배선 검증.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShareButtons } from "../ShareButtons";

describe("ShareButtons", () => {
  it("isEn=false(default) 시 KO 라벨 렌더", () => {
    render(<ShareButtons url="https://example.com" title="테스트" />);
    expect(screen.getByText("공유")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Twitter에 공유" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Facebook에 공유" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "링크 복사" })).toBeInTheDocument();
  });

  it("isEn=true 시 EN 라벨/aria-label 치환", () => {
    render(<ShareButtons url="https://example.com" title="test" isEn />);
    expect(screen.getByText("Share")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Share on Twitter" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Share on Facebook" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
  });
});
