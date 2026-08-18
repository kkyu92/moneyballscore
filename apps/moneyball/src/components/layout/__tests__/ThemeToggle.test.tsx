/**
 * ThemeToggle unit test — cycle 2144 review-code(heavy).
 *
 * 의도: NavLinks(Header desktop nav) 안 ThemeToggle isEn 신규 배선 검증.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeToggle } from "../ThemeToggle";

describe("ThemeToggle", () => {
  it("isEn=false(default) 시 KO aria-label/title (테마: 시스템, default theme)", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: "테마: 시스템" });
    expect(button).toHaveAttribute("title", "테마: 시스템");
  });

  it("isEn=true 시 EN aria-label/title (Theme: System)", () => {
    render(<ThemeToggle isEn />);
    const button = screen.getByRole("button", { name: "Theme: System" });
    expect(button).toHaveAttribute("title", "Theme: System");
  });
});
