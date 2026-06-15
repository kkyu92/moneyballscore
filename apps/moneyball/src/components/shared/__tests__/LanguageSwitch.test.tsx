import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageSwitch } from "../LanguageSwitch";

describe("LanguageSwitch", () => {
  it("ko/en link 둘 다 박제", () => {
    render(<LanguageSwitch koHref="/mlb" enHref="/en/mlb" current="ko" />);
    expect(screen.getByRole("link", { name: "한국어" })).toHaveAttribute("href", "/mlb");
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en/mlb");
  });

  it("current='ko' 시 한국어 link 만 aria-current='page'", () => {
    render(<LanguageSwitch koHref="/mlb" enHref="/en/mlb" current="ko" />);
    expect(screen.getByRole("link", { name: "한국어" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "English" })).not.toHaveAttribute("aria-current");
  });

  it("current='en' 시 English link 만 aria-current='page'", () => {
    render(<LanguageSwitch koHref="/mlb" enHref="/en/mlb" current="en" />);
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "한국어" })).not.toHaveAttribute("aria-current");
  });

  it("hrefLang attr 박제", () => {
    render(<LanguageSwitch koHref="/mlb" enHref="/en/mlb" current="ko" />);
    expect(screen.getByRole("link", { name: "한국어" })).toHaveAttribute("hreflang", "ko");
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("hreflang", "en");
  });
});
