/**
 * CookieConsent unit test — cycle 2144 review-code(heavy).
 *
 * 의도: layout.tsx 무조건 렌더 chrome 시리즈(Header/Footer/SearchForm) EN i18n
 * sweep 잔여 — CookieConsent isEn 신규 배선 검증.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CookieConsent } from "../CookieConsent";

describe("CookieConsent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("isEn=false(default) 시 KO 문구 렌더", () => {
    render(<CookieConsent />);
    const region = screen.getByRole("region", { name: "쿠키 사용 안내" });
    expect(region).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "개인정보처리방침" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "자세히" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "쿠키 사용 안내 확인 후 닫기" })).toBeInTheDocument();
  });

  it("isEn=true 시 EN 문구 + aria-label 치환, href 는 /privacy 유지 (no /en 대응 라우트)", () => {
    render(<CookieConsent isEn />);
    const region = screen.getByRole("region", { name: "Cookie notice" });
    expect(region).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Learn more" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("button", { name: "Acknowledge and dismiss cookie notice" })).toBeInTheDocument();
    expect(screen.getByText("Got it")).toBeInTheDocument();
  });
});
